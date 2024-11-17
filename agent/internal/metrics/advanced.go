package metrics

import (
	"context"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/net"
	"github.com/shirou/gopsutil/v3/process"
	"go.uber.org/zap"
)

// DiskMetrics contains detailed disk metrics
type DiskMetrics struct {
	Device      string  `json:"device"`
	Mountpoint  string  `json:"mountpoint"`
	Filesystem  string  `json:"filesystem"`
	Total       uint64  `json:"total"`
	Used        uint64  `json:"used"`
	Free        uint64  `json:"free"`
	UsagePercent float64 `json:"usage_percent"`
	IOCounters  disk.IOCountersStat `json:"io_counters"`
}

// NetworkMetrics contains detailed network metrics
type NetworkMetrics struct {
	Interface   string `json:"interface"`
	BytesSent   uint64 `json:"bytes_sent"`
	BytesRecv   uint64 `json:"bytes_recv"`
	PacketsSent uint64 `json:"packets_sent"`
	PacketsRecv uint64 `json:"packets_recv"`
	Errors      uint64 `json:"errors"`
	Drops       uint64 `json:"drops"`
}

// ProcessMetrics contains detailed process metrics
type ProcessMetrics struct {
	PID          int32   `json:"pid"`
	Name         string  `json:"name"`
	Username     string  `json:"username"`
	CPUPercent   float64 `json:"cpu_percent"`
	MemoryRSS    uint64  `json:"memory_rss"`
	MemoryVMS    uint64  `json:"memory_vms"`
	ReadBytes    uint64  `json:"read_bytes"`
	WriteBytes   uint64  `json:"write_bytes"`
	NumThreads   int32   `json:"num_threads"`
	NumFDs       int32   `json:"num_fds"`
	CreateTime   int64   `json:"create_time"`
	Status       string  `json:"status"`
	Nice         int32   `json:"nice"`
	IONiceness   int32   `json:"io_niceness"`
	CtxSwitches  *process.NumCtxSwitchesStat `json:"ctx_switches"`
}

// AdvancedMetrics contains detailed system metrics
type AdvancedMetrics struct {
	Disks       map[string]DiskMetrics    `json:"disks"`
	Network     map[string]NetworkMetrics `json:"network"`
	TopProcesses []ProcessMetrics         `json:"top_processes"`
	Timestamp   time.Time                `json:"timestamp"`
}

// AdvancedCollector collects detailed system metrics
type AdvancedCollector struct {
	interval    time.Duration
	logger      *zap.Logger
	metrics     *AdvancedMetrics
	numProcs    int
	diskFilter  []string
	netFilter   []string
}

// NewAdvancedCollector creates a new advanced metrics collector
func NewAdvancedCollector(interval time.Duration, numProcs int, logger *zap.Logger) *AdvancedCollector {
	return &AdvancedCollector{
		interval: interval,
		logger:   logger,
		metrics:  &AdvancedMetrics{
			Disks:   make(map[string]DiskMetrics),
			Network: make(map[string]NetworkMetrics),
		},
		numProcs:   numProcs,
		diskFilter: []string{"/dev", "/sys", "/proc", "/run"},
		netFilter:  []string{"lo", "docker", "veth", "br-"},
	}
}

// Start begins metrics collection
func (c *AdvancedCollector) Start(ctx context.Context) error {
	// Initial collection
	if err := c.collect(); err != nil {
		return err
	}

	// Start collection loop
	ticker := time.NewTicker(c.interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-ticker.C:
			if err := c.collect(); err != nil {
				c.logger.Error("Failed to collect advanced metrics",
					zap.Error(err))
			}
		}
	}
}

// collect gathers detailed system metrics
func (c *AdvancedCollector) collect() error {
	metrics := &AdvancedMetrics{
		Disks:   make(map[string]DiskMetrics),
		Network: make(map[string]NetworkMetrics),
		Timestamp: time.Now(),
	}

	// Collect disk metrics
	if err := c.collectDiskMetrics(metrics); err != nil {
		c.logger.Debug("Failed to collect disk metrics", zap.Error(err))
	}

	// Collect network metrics
	if err := c.collectNetworkMetrics(metrics); err != nil {
		c.logger.Debug("Failed to collect network metrics", zap.Error(err))
	}

	// Collect process metrics
	if err := c.collectProcessMetrics(metrics); err != nil {
		c.logger.Debug("Failed to collect process metrics", zap.Error(err))
	}

	c.metrics = metrics
	return nil
}

// collectDiskMetrics gathers detailed disk metrics
func (c *AdvancedCollector) collectDiskMetrics(metrics *AdvancedMetrics) error {
	// Get partitions
	partitions, err := disk.Partitions(false)
	if err != nil {
		return fmt.Errorf("failed to get partitions: %w", err)
	}

	// Get IO counters
	ioCounters, err := disk.IOCounters()
	if err != nil {
		c.logger.Debug("Failed to get disk IO counters", zap.Error(err))
	}

	for _, partition := range partitions {
		// Skip filtered mountpoints
		skip := false
		for _, filter := range c.diskFilter {
			if strings.HasPrefix(partition.Mountpoint, filter) {
				skip = true
				break
			}
		}
		if skip {
			continue
		}

		// Get usage
		usage, err := disk.Usage(partition.Mountpoint)
		if err != nil {
			c.logger.Debug("Failed to get disk usage",
				zap.String("mountpoint", partition.Mountpoint),
				zap.Error(err))
			continue
		}

		metrics.Disks[partition.Device] = DiskMetrics{
			Device:       partition.Device,
			Mountpoint:   partition.Mountpoint,
			Filesystem:   partition.Fstype,
			Total:        usage.Total,
			Used:         usage.Used,
			Free:         usage.Free,
			UsagePercent: usage.UsedPercent,
			IOCounters:   ioCounters[partition.Device],
		}
	}

	return nil
}

// collectNetworkMetrics gathers detailed network metrics
func (c *AdvancedCollector) collectNetworkMetrics(metrics *AdvancedMetrics) error {
	interfaces, err := net.Interfaces()
	if err != nil {
		return fmt.Errorf("failed to get network interfaces: %w", err)
	}

	counters, err := net.IOCounters(true)
	if err != nil {
		return fmt.Errorf("failed to get network counters: %w", err)
	}

	for _, iface := range interfaces {
		// Skip filtered interfaces
		skip := false
		for _, filter := range c.netFilter {
			if strings.HasPrefix(iface.Name, filter) {
				skip = true
				break
			}
		}
		if skip {
			continue
		}

		// Find matching counter
		for _, counter := range counters {
			if counter.Name == iface.Name {
				metrics.Network[iface.Name] = NetworkMetrics{
					Interface:   iface.Name,
					BytesSent:   counter.BytesSent,
					BytesRecv:   counter.BytesRecv,
					PacketsSent: counter.PacketsSent,
					PacketsRecv: counter.PacketsRecv,
					Errors:      counter.Errin + counter.Errout,
					Drops:       counter.Dropin + counter.Dropout,
				}
				break
			}
		}
	}

	return nil
}

// collectProcessMetrics gathers detailed process metrics
func (c *AdvancedCollector) collectProcessMetrics(metrics *AdvancedMetrics) error {
	processes, err := process.Processes()
	if err != nil {
		return fmt.Errorf("failed to get processes: %w", err)
	}

	var procMetrics []ProcessMetrics
	for _, p := range processes {
		metric, err := c.getProcessMetrics(p)
		if err != nil {
			continue
		}
		procMetrics = append(procMetrics, metric)
	}

	// Sort by CPU usage and get top N
	sort.Slice(procMetrics, func(i, j int) bool {
		return procMetrics[i].CPUPercent > procMetrics[j].CPUPercent
	})

	if len(procMetrics) > c.numProcs {
		metrics.TopProcesses = procMetrics[:c.numProcs]
	} else {
		metrics.TopProcesses = procMetrics
	}

	return nil
}

// getProcessMetrics gathers metrics for a single process
func (c *AdvancedCollector) getProcessMetrics(p *process.Process) (ProcessMetrics, error) {
	metric := ProcessMetrics{
		PID: p.Pid,
	}

	// Get process name
	name, err := p.Name()
	if err == nil {
		metric.Name = name
	}

	// Get username
	username, err := p.Username()
	if err == nil {
		metric.Username = username
	}

	// Get CPU usage
	cpu, err := p.CPUPercent()
	if err == nil {
		metric.CPUPercent = cpu
	}

	// Get memory info
	memInfo, err := p.MemoryInfo()
	if err == nil {
		metric.MemoryRSS = memInfo.RSS
		metric.MemoryVMS = memInfo.VMS
	}

	// Get IO counters
	ioCounters, err := p.IOCounters()
	if err == nil {
		metric.ReadBytes = ioCounters.ReadBytes
		metric.WriteBytes = ioCounters.WriteBytes
	}

	// Get thread count
	numThreads, err := p.NumThreads()
	if err == nil {
		metric.NumThreads = numThreads
	}

	// Get file descriptor count
	numFDs, err := p.NumFDs()
	if err == nil {
		metric.NumFDs = numFDs
	}

	// Get creation time
	createTime, err := p.CreateTime()
	if err == nil {
		metric.CreateTime = createTime
	}

	// Get process status
	status, err := p.Status()
	if err == nil && len(status) > 0 {
		metric.Status = status[0]
	}

	// Get nice values
	nice, err := p.Nice()
	if err == nil {
		metric.Nice = nice
	}

	ionice, err := p.IOnice()
	if err == nil {
		metric.IONiceness = ionice
	}

	// Get context switches
	ctxSwitches, err := p.NumCtxSwitches()
	if err == nil {
		metric.CtxSwitches = ctxSwitches
	}

	return metric, nil
}

// GetMetrics returns the current advanced metrics
func (c *AdvancedCollector) GetMetrics() *AdvancedMetrics {
	return c.metrics
}

// Shutdown stops the advanced metrics collector
func (c *AdvancedCollector) Shutdown(ctx context.Context) error {
	// Nothing to clean up
	return nil
}

// HealthCheck implements the health.Checker interface
func (c *AdvancedCollector) HealthCheck(ctx context.Context) error {
	if time.Since(c.metrics.Timestamp) > c.interval*2 {
		return ErrStaleMetrics
	}
	return nil
}
