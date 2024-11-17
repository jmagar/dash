package optimizer

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"sync"
	"syscall"
	"time"

	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/mem"
	"github.com/shirou/gopsutil/v3/process"
	"go.uber.org/zap"
)

// Optimizer manages system resource optimization
type Optimizer struct {
	logger *zap.Logger
	mu     sync.RWMutex

	// Thresholds
	diskThreshold  float64 // percentage
	memThreshold   float64 // percentage
	cpuThreshold   float64 // percentage
	cleanupAgeDays int    // days

	// Optimization status
	lastOptimization time.Time
	optimizations    []Optimization
}

// Optimization represents a single optimization action
type Optimization struct {
	Type        string
	Target      string
	Action      string
	Impact      float64
	TimeStamp   time.Time
	Description string
}

// ResourceUsage represents current resource usage
type ResourceUsage struct {
	CPU     float64
	Memory  float64
	Disk    float64
	Process *ProcessUsage
}

// ProcessUsage represents process resource usage
type ProcessUsage struct {
	PID         int32
	Name        string
	CPU         float64
	Memory      float64
	OpenFiles   int
	Connections int
}

// NewOptimizer creates a new optimizer instance
func NewOptimizer(logger *zap.Logger) *Optimizer {
	return &Optimizer{
		logger:         logger,
		diskThreshold: 90,  // 90% disk usage
		memThreshold:  85,  // 85% memory usage
		cpuThreshold:  80,  // 80% CPU usage
		cleanupAgeDays: 30, // 30 days for old files
	}
}

// SetThresholds updates optimization thresholds
func (o *Optimizer) SetThresholds(disk, mem, cpu float64) {
	o.mu.Lock()
	defer o.mu.Unlock()

	o.diskThreshold = disk
	o.memThreshold = mem
	o.cpuThreshold = cpu
}

// Analyze checks system resources and suggests optimizations
func (o *Optimizer) Analyze(ctx context.Context) error {
	o.logger.Info("Starting resource analysis")

	// Get current resource usage
	usage, err := o.getCurrentUsage()
	if err != nil {
		return fmt.Errorf("failed to get resource usage: %w", err)
	}

	o.mu.Lock()
	defer o.mu.Unlock()

	// Check thresholds and suggest optimizations
	var optimizations []Optimization

	// Check disk usage
	if usage.Disk >= o.diskThreshold {
		diskOpts, err := o.analyzeDiskUsage(ctx)
		if err != nil {
			o.logger.Error("Failed to analyze disk usage", zap.Error(err))
		} else {
			optimizations = append(optimizations, diskOpts...)
		}
	}

	// Check memory usage
	if usage.Memory >= o.memThreshold {
		memOpts, err := o.analyzeMemoryUsage(ctx)
		if err != nil {
			o.logger.Error("Failed to analyze memory usage", zap.Error(err))
		} else {
			optimizations = append(optimizations, memOpts...)
		}
	}

	// Check CPU usage
	if usage.CPU >= o.cpuThreshold {
		cpuOpts, err := o.analyzeCPUUsage(ctx)
		if err != nil {
			o.logger.Error("Failed to analyze CPU usage", zap.Error(err))
		} else {
			optimizations = append(optimizations, cpuOpts...)
		}
	}

	o.optimizations = optimizations
	o.lastOptimization = time.Now()

	return nil
}

// getCurrentUsage gets current system resource usage
func (o *Optimizer) getCurrentUsage() (*ResourceUsage, error) {
	// Get CPU usage
	cpuPercent, err := cpu.Percent(time.Second, false)
	if err != nil {
		return nil, fmt.Errorf("failed to get CPU usage: %w", err)
	}

	// Get memory usage
	vmStat, err := mem.VirtualMemory()
	if err != nil {
		return nil, fmt.Errorf("failed to get memory usage: %w", err)
	}

	// Get disk usage
	parts, err := disk.Partitions(true)
	if err != nil {
		return nil, fmt.Errorf("failed to get disk partitions: %w", err)
	}

	var totalDiskUsage float64
	var partitionCount int
	for _, part := range parts {
		usage, err := disk.Usage(part.Mountpoint)
		if err != nil {
			continue
		}
		totalDiskUsage += usage.UsedPercent
		partitionCount++
	}

	if partitionCount == 0 {
		return nil, fmt.Errorf("no valid disk partitions found")
	}

	avgDiskUsage := totalDiskUsage / float64(partitionCount)

	return &ResourceUsage{
		CPU:    cpuPercent[0],
		Memory: vmStat.UsedPercent,
		Disk:   avgDiskUsage,
	}, nil
}

// analyzeDiskUsage analyzes disk usage and suggests optimizations
func (o *Optimizer) analyzeDiskUsage(ctx context.Context) ([]Optimization, error) {
	var optimizations []Optimization

	// Find large files
	largeFiles, err := o.findLargeFiles(ctx, "/")
	if err != nil {
		return nil, fmt.Errorf("failed to find large files: %w", err)
	}

	for _, file := range largeFiles {
		optimizations = append(optimizations, Optimization{
			Type:        "disk",
			Target:      file,
			Action:      "delete_large_file",
			TimeStamp:   time.Now(),
			Description: fmt.Sprintf("Large file found: %s", file),
		})
	}

	// Find old files
	oldFiles, err := o.findOldFiles(ctx, "/", o.cleanupAgeDays)
	if err != nil {
		return nil, fmt.Errorf("failed to find old files: %w", err)
	}

	for _, file := range oldFiles {
		optimizations = append(optimizations, Optimization{
			Type:        "disk",
			Target:      file,
			Action:      "delete_old_file",
			TimeStamp:   time.Now(),
			Description: fmt.Sprintf("Old file found: %s", file),
		})
	}

	return optimizations, nil
}

// analyzeMemoryUsage analyzes memory usage and suggests optimizations
func (o *Optimizer) analyzeMemoryUsage(ctx context.Context) ([]Optimization, error) {
	var optimizations []Optimization

	// Get processes sorted by memory usage
	processes, err := process.Processes()
	if err != nil {
		return nil, fmt.Errorf("failed to get processes: %w", err)
	}

	type procInfo struct {
		pid     int32
		name    string
		memPerc float32
	}

	var procs []procInfo
	for _, p := range processes {
		name, err := p.Name()
		if err != nil {
			continue
		}

		mem, err := p.MemoryPercent()
		if err != nil {
			continue
		}

		procs = append(procs, procInfo{
			pid:     p.Pid,
			name:    name,
			memPerc: mem,
		})
	}

	// Sort by memory usage
	sort.Slice(procs, func(i, j int) bool {
		return procs[i].memPerc > procs[j].memPerc
	})

	// Suggest optimizations for top memory consumers
	for i := 0; i < 5 && i < len(procs); i++ {
		if procs[i].memPerc > 20 { // If using more than 20% memory
			optimizations = append(optimizations, Optimization{
				Type:        "memory",
				Target:      fmt.Sprintf("%s (PID: %d)", procs[i].name, procs[i].pid),
				Action:      "reduce_memory",
				TimeStamp:   time.Now(),
				Description: fmt.Sprintf("High memory usage: %.2f%%", procs[i].memPerc),
			})
		}
	}

	return optimizations, nil
}

// analyzeCPUUsage analyzes CPU usage and suggests optimizations
func (o *Optimizer) analyzeCPUUsage(ctx context.Context) ([]Optimization, error) {
	var optimizations []Optimization

	// Get processes sorted by CPU usage
	processes, err := process.Processes()
	if err != nil {
		return nil, fmt.Errorf("failed to get processes: %w", err)
	}

	type procInfo struct {
		pid      int32
		name     string
		cpuPerc  float64
		priority int32
	}

	var procs []procInfo
	for _, p := range processes {
		name, err := p.Name()
		if err != nil {
			continue
		}

		cpu, err := p.CPUPercent()
		if err != nil {
			continue
		}

		nice, err := p.Nice()
		if err != nil {
			continue
		}

		procs = append(procs, procInfo{
			pid:      p.Pid,
			name:     name,
			cpuPerc:  cpu,
			priority: nice,
		})
	}

	// Sort by CPU usage
	sort.Slice(procs, func(i, j int) bool {
		return procs[i].cpuPerc > procs[j].cpuPerc
	})

	// Suggest optimizations for top CPU consumers
	for i := 0; i < 5 && i < len(procs); i++ {
		if procs[i].cpuPerc > 50 { // If using more than 50% CPU
			optimizations = append(optimizations, Optimization{
				Type:        "cpu",
				Target:      fmt.Sprintf("%s (PID: %d)", procs[i].name, procs[i].pid),
				Action:      "adjust_priority",
				TimeStamp:   time.Now(),
				Description: fmt.Sprintf("High CPU usage: %.2f%%", procs[i].cpuPerc),
			})
		}
	}

	return optimizations, nil
}

// findLargeFiles finds files larger than 100MB
func (o *Optimizer) findLargeFiles(ctx context.Context, root string) ([]string, error) {
	var largeFiles []string

	err := filepath.Walk(root, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil // Skip files we can't access
		}

		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		if !info.IsDir() && info.Size() > 100*1024*1024 { // 100MB
			largeFiles = append(largeFiles, path)
		}

		return nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to walk directory: %w", err)
	}

	return largeFiles, nil
}

// findOldFiles finds files older than specified days
func (o *Optimizer) findOldFiles(ctx context.Context, root string, days int) ([]string, error) {
	var oldFiles []string
	cutoff := time.Now().AddDate(0, 0, -days)

	err := filepath.Walk(root, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil // Skip files we can't access
		}

		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		if !info.IsDir() && info.ModTime().Before(cutoff) {
			oldFiles = append(oldFiles, path)
		}

		return nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to walk directory: %w", err)
	}

	return oldFiles, nil
}

// GetOptimizations returns current optimization suggestions
func (o *Optimizer) GetOptimizations() []Optimization {
	o.mu.RLock()
	defer o.mu.RUnlock()

	// Return a copy to prevent external modifications
	optimizations := make([]Optimization, len(o.optimizations))
	copy(optimizations, o.optimizations)

	return optimizations
}

// LastOptimizationTime returns the time of last optimization analysis
func (o *Optimizer) LastOptimizationTime() time.Time {
	o.mu.RLock()
	defer o.mu.RUnlock()
	return o.lastOptimization
}

// CleanupOldFiles removes files older than the specified age
func (o *Optimizer) CleanupOldFiles(ctx context.Context, path string) error {
	oldFiles, err := o.findOldFiles(ctx, path, o.cleanupAgeDays)
	if err != nil {
		return fmt.Errorf("failed to find old files: %w", err)
	}

	for _, file := range oldFiles {
		if err := os.Remove(file); err != nil {
			o.logger.Error("Failed to remove old file",
				zap.String("file", file),
				zap.Error(err))
		} else {
			o.logger.Info("Removed old file",
				zap.String("file", file))
		}
	}

	return nil
}

// AdjustProcessPriority adjusts the priority of a process
func (o *Optimizer) AdjustProcessPriority(pid int32, priority int) error {
	proc, err := process.NewProcess(pid)
	if err != nil {
		return fmt.Errorf("failed to find process: %w", err)
	}

	// Get process UID
	uids, err := proc.Uids()
	if err != nil {
		return fmt.Errorf("failed to get process UIDs: %w", err)
	}

	if len(uids) == 0 {
		return fmt.Errorf("no UIDs found for process")
	}

	// Set process priority using syscall
	err = syscall.Setpriority(syscall.PRIO_PROCESS, int(pid), priority)
	if err != nil {
		return fmt.Errorf("failed to set process priority: %w", err)
	}

	return nil
}
