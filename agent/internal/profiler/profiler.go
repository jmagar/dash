package profiler

import (
	"context"
	"fmt"
	"runtime"
	"sort"
	"sync"
	"time"

	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/process"
	"go.uber.org/zap"
)

// ProfileType represents the type of profile
type ProfileType string

const (
	TypeCPU     ProfileType = "cpu"
	TypeMemory  ProfileType = "memory"
	TypeIO      ProfileType = "io"
	TypeNetwork ProfileType = "network"
	TypeLock    ProfileType = "lock"
)

// Profile represents a performance profile
type Profile struct {
	ID        string                 `json:"id"`
	Type      ProfileType           `json:"type"`
	StartTime time.Time             `json:"start_time"`
	EndTime   time.Time             `json:"end_time"`
	Duration  time.Duration         `json:"duration"`
	Samples   int                   `json:"samples"`
	Data      map[string]float64    `json:"data"`
	Metadata  map[string]string     `json:"metadata"`
	Hotspots  []Hotspot            `json:"hotspots"`
}

// Hotspot represents a performance hotspot
type Hotspot struct {
	Resource    string  `json:"resource"`
	Usage       float64 `json:"usage"`
	Impact      float64 `json:"impact"`
	Bottleneck  bool    `json:"bottleneck"`
	Suggestion  string  `json:"suggestion"`
}

// ProfileConfig represents profiling configuration
type ProfileConfig struct {
	Types       []ProfileType `json:"types"`
	Duration    time.Duration `json:"duration"`
	Interval    time.Duration `json:"interval"`
	MaxSamples  int          `json:"max_samples"`
	Threshold   float64      `json:"threshold"`
}

// Profiler performs performance profiling
type Profiler struct {
	logger    *zap.Logger
	profiles  map[string]*Profile
	mu        sync.RWMutex
	sampling  bool
}

// NewProfiler creates a new profiler
func NewProfiler(logger *zap.Logger) *Profiler {
	return &Profiler{
		logger:   logger,
		profiles: make(map[string]*Profile),
	}
}

// Start begins profiling
func (p *Profiler) Start(ctx context.Context, config ProfileConfig) (*Profile, error) {
	if p.sampling {
		return nil, fmt.Errorf("profiling already in progress")
	}

	profile := &Profile{
		ID:        fmt.Sprintf("prof_%d", time.Now().UnixNano()),
		StartTime: time.Now(),
		Data:      make(map[string]float64),
		Metadata:  make(map[string]string),
	}

	p.mu.Lock()
	p.profiles[profile.ID] = profile
	p.sampling = true
	p.mu.Unlock()

	// Start sampling goroutine
	go func() {
		defer func() {
			p.mu.Lock()
			p.sampling = false
			p.mu.Unlock()
		}()

		ticker := time.NewTicker(config.Interval)
		defer ticker.Stop()

		samples := 0
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				if samples >= config.MaxSamples {
					return
				}

				for _, profType := range config.Types {
					if err := p.sample(profile, profType); err != nil {
						p.logger.Error("Sampling failed",
							zap.String("type", string(profType)),
							zap.Error(err))
					}
				}

				samples++
			}
		}
	}()

	return profile, nil
}

// sample takes a single profile sample
func (p *Profiler) sample(profile *Profile, profType ProfileType) error {
	switch profType {
	case TypeCPU:
		return p.sampleCPU(profile)
	case TypeMemory:
		return p.sampleMemory(profile)
	case TypeIO:
		return p.sampleIO(profile)
	case TypeNetwork:
		return p.sampleNetwork(profile)
	case TypeLock:
		return p.sampleLocks(profile)
	default:
		return fmt.Errorf("unsupported profile type: %s", profType)
	}
}

// sampleCPU samples CPU usage
func (p *Profiler) sampleCPU(profile *Profile) error {
	// Get CPU percentages
	percentages, err := cpu.Percent(0, true)
	if err != nil {
		return fmt.Errorf("failed to get CPU percentages: %w", err)
	}

	// Get process CPU usage
	processes, err := process.Processes()
	if err != nil {
		return fmt.Errorf("failed to get processes: %w", err)
	}

	var topProcs []struct {
		name    string
		cpu     float64
	}

	for _, proc := range processes {
		cpu, err := proc.CPUPercent()
		if err != nil {
			continue
		}

		name, err := proc.Name()
		if err != nil {
			continue
		}

		topProcs = append(topProcs, struct {
			name    string
			cpu     float64
		}{name, cpu})
	}

	// Sort by CPU usage
	sort.Slice(topProcs, func(i, j int) bool {
		return topProcs[i].cpu > topProcs[j].cpu
	})

	// Add hotspots
	for i := 0; i < min(3, len(topProcs)); i++ {
		proc := topProcs[i]
		profile.Hotspots = append(profile.Hotspots, Hotspot{
			Resource:   proc.name,
			Usage:     proc.cpu,
			Impact:    proc.cpu / 100,
			Bottleneck: proc.cpu > 80,
			Suggestion: "Consider optimizing or scaling this process",
		})
	}

	// Update profile data
	for i, pct := range percentages {
		profile.Data[fmt.Sprintf("cpu_%d", i)] = pct
	}

	return nil
}

// sampleMemory samples memory usage
func (p *Profiler) sampleMemory(profile *Profile) error {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)

	profile.Data["alloc"] = float64(m.Alloc)
	profile.Data["total_alloc"] = float64(m.TotalAlloc)
	profile.Data["sys"] = float64(m.Sys)
	profile.Data["heap_alloc"] = float64(m.HeapAlloc)
	profile.Data["heap_sys"] = float64(m.HeapSys)
	profile.Data["heap_idle"] = float64(m.HeapIdle)
	profile.Data["heap_inuse"] = float64(m.HeapInuse)
	profile.Data["heap_released"] = float64(m.HeapReleased)
	profile.Data["heap_objects"] = float64(m.HeapObjects)

	// Add memory hotspots
	if float64(m.HeapInuse)/float64(m.HeapSys) > 0.9 {
		profile.Hotspots = append(profile.Hotspots, Hotspot{
			Resource:   "heap",
			Usage:     float64(m.HeapInuse) / float64(m.HeapSys) * 100,
			Impact:    0.9,
			Bottleneck: true,
			Suggestion: "High heap usage, consider increasing heap size or optimizing memory usage",
		})
	}

	return nil
}

// sampleIO samples I/O usage
func (p *Profiler) sampleIO(profile *Profile) error {
	processes, err := process.Processes()
	if err != nil {
		return fmt.Errorf("failed to get processes: %w", err)
	}

	var totalRead, totalWrite uint64
	var topIO []struct {
		name     string
		ioTotal  uint64
	}

	for _, proc := range processes {
		io, err := proc.IOCounters()
		if err != nil {
			continue
		}

		name, err := proc.Name()
		if err != nil {
			continue
		}

		totalRead += io.ReadBytes
		totalWrite += io.WriteBytes

		topIO = append(topIO, struct {
			name     string
			ioTotal  uint64
		}{name, io.ReadBytes + io.WriteBytes})
	}

	// Sort by IO usage
	sort.Slice(topIO, func(i, j int) bool {
		return topIO[i].ioTotal > topIO[j].ioTotal
	})

	// Add IO hotspots
	for i := 0; i < min(3, len(topIO)); i++ {
		proc := topIO[i]
		profile.Hotspots = append(profile.Hotspots, Hotspot{
			Resource:   proc.name,
			Usage:     float64(proc.ioTotal) / float64(totalRead+totalWrite) * 100,
			Impact:    float64(proc.ioTotal) / float64(1<<30), // Impact in GB
			Bottleneck: proc.ioTotal > 1<<30, // More than 1GB
			Suggestion: "High I/O usage, consider optimizing I/O operations or using buffering",
		})
	}

	profile.Data["total_read"] = float64(totalRead)
	profile.Data["total_write"] = float64(totalWrite)

	return nil
}

// sampleNetwork samples network usage
func (p *Profiler) sampleNetwork(profile *Profile) error {
	// Implement network usage sampling
	return fmt.Errorf("network sampling not implemented")
}

// sampleLocks samples lock contention
func (p *Profiler) sampleLocks(profile *Profile) error {
	// Implement lock contention sampling
	return fmt.Errorf("lock sampling not implemented")
}

// Stop stops profiling
func (p *Profiler) Stop(id string) error {
	p.mu.Lock()
	defer p.mu.Unlock()

	profile, ok := p.profiles[id]
	if !ok {
		return fmt.Errorf("profile not found: %s", id)
	}

	profile.EndTime = time.Now()
	profile.Duration = profile.EndTime.Sub(profile.StartTime)

	return nil
}

// GetProfiles returns all profiles
func (p *Profiler) GetProfiles() []Profile {
	p.mu.RLock()
	defer p.mu.RUnlock()

	profiles := make([]Profile, 0, len(p.profiles))
	for _, profile := range p.profiles {
		profiles = append(profiles, *profile)
	}
	return profiles
}

// GetProfile returns a specific profile
func (p *Profiler) GetProfile(id string) (*Profile, bool) {
	p.mu.RLock()
	defer p.mu.RUnlock()

	profile, ok := p.profiles[id]
	return profile, ok
}

// ClearProfiles clears all profiles
func (p *Profiler) ClearProfiles() {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.profiles = make(map[string]*Profile)
}

// min returns the minimum of two integers
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
