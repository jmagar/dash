package metrics

import (
	"context"
	"fmt"
	"time"

	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/load"
	"github.com/shirou/gopsutil/v3/mem"
	"github.com/shirou/gopsutil/v3/net"
	"go.uber.org/zap"
)

// Connection types from gopsutil
const (
	connTypeTCP  uint32 = 1
	connTypeUDP  uint32 = 2
	connTypeTCP6 uint32 = 3
	connTypeUDP6 uint32 = 4
)

// Connection status constants
const (
	connStatusListen = "LISTEN"
)

type SystemMetrics struct {
	Timestamp     time.Time      `json:"timestamp"`
	CPU          *CPUMetrics    `json:"cpu"`
	Memory       *MemoryMetrics `json:"memory"`
	Storage      *StorageMetrics `json:"storage"`
	Network      *NetMetrics    `json:"network"`
	LoadAverage  [3]float64     `json:"load_average"`
	UptimeSeconds int64         `json:"uptime_seconds"`
	CPUUsage     float64       `json:"cpu_usage"`
	MemoryTotal  uint64        `json:"memory_total"`
	MemoryUsed   uint64        `json:"memory_used"`
	DiskTotal    uint64        `json:"disk_total"`
	DiskUsed     uint64        `json:"disk_used"`
}

type CPUMetrics struct {
	User    float64 `json:"user"`
	System  float64 `json:"system"`
	Idle    float64 `json:"idle"`
	IOWait  float64 `json:"iowait,omitempty"`
	Steal   float64 `json:"steal,omitempty"`
	Total   float64 `json:"total"`
	Cores   int32   `json:"cores"`
	Threads int32   `json:"threads"`
}

type MemoryMetrics struct {
	Total     uint64  `json:"total"`
	Used      uint64  `json:"used"`
	Free      uint64  `json:"free"`
	Shared    uint64  `json:"shared"`
	Buffers   uint64  `json:"buffers,omitempty"`
	Cached    uint64  `json:"cached,omitempty"`
	Available uint64  `json:"available"`
	SwapTotal uint64  `json:"swap_total"`
	SwapUsed  uint64  `json:"swap_used"`
	SwapFree  uint64  `json:"swap_free"`
	Usage     float64 `json:"usage"`
}

type StorageMetrics struct {
	IOStats    *IOMetrics `json:"io_stats,omitempty"`
	Total      uint64     `json:"total"`
	Used       uint64     `json:"used"`
	Free       uint64     `json:"free"`
	Usage      float64    `json:"usage"`
}

type IOMetrics struct {
	ReadCount  uint64 `json:"reads"`
	WriteCount uint64 `json:"writes"`
	ReadBytes  uint64 `json:"read_bytes"`
	WriteBytes uint64 `json:"write_bytes"`
	IOTime     uint64 `json:"io_time,omitempty"`
}

type NetMetrics struct {
	BytesSent    uint64 `json:"bytes_sent"`
	BytesRecv    uint64 `json:"bytes_recv"`
	PacketsSent  uint64 `json:"packets_sent"`
	PacketsRecv  uint64 `json:"packets_recv"`
	ErrorsIn     uint64 `json:"errors_in"`
	ErrorsOut    uint64 `json:"errors_out"`
	DropsIn      uint64 `json:"drops_in"`
	DropsOut     uint64 `json:"drops_out"`
	Connections  int    `json:"connections"`
	TCPConns     int    `json:"tcp_conns"`
	UDPConns     int    `json:"udp_conns"`
	ListenPorts  int    `json:"listen_ports"`
	Interfaces   int    `json:"interfaces"`
	TotalSpeed   uint64 `json:"total_speed"`
	AverageSpeed uint64 `json:"average_speed"`
}

type Collector struct {
	logger *zap.Logger
	ctx    context.Context
	cancel context.CancelFunc
	metrics *SystemMetrics
	startTime time.Time
}

func NewCollector(logger *zap.Logger) *Collector {
	ctx, cancel := context.WithCancel(context.Background())
	return &Collector{
		logger: logger,
		ctx:    ctx,
		cancel: cancel,
		metrics: &SystemMetrics{},
		startTime: time.Now(),
	}
}

func (c *Collector) Start(ctx context.Context) error {
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-ticker.C:
			if err := c.collect(); err != nil {
				c.logger.Error("Failed to collect metrics", zap.Error(err))
			}
		}
	}
}

func (c *Collector) Shutdown(ctx context.Context) error {
	c.cancel()
	return nil
}

func (c *Collector) GetMetrics() *SystemMetrics {
	return c.metrics
}

func (c *Collector) collect() error {
	metrics := &SystemMetrics{
		Timestamp: time.Now(),
		UptimeSeconds: int64(time.Since(c.startTime).Seconds()),
	}

	// CPU metrics
	if cpuMetrics, err := c.collectCPUMetrics(); err == nil {
		metrics.CPU = cpuMetrics
		metrics.CPUUsage = cpuMetrics.Total
	} else {
		c.logger.Error("Failed to collect CPU metrics", zap.Error(err))
	}

	// Memory metrics
	if memMetrics, err := c.collectMemoryMetrics(); err == nil {
		metrics.Memory = memMetrics
		metrics.MemoryTotal = memMetrics.Total
		metrics.MemoryUsed = memMetrics.Used
	} else {
		c.logger.Error("Failed to collect memory metrics", zap.Error(err))
	}

	// Storage metrics
	if storageMetrics, err := c.collectStorageMetrics(); err == nil {
		metrics.Storage = storageMetrics
		metrics.DiskTotal = storageMetrics.Total
		metrics.DiskUsed = storageMetrics.Used
	} else {
		c.logger.Error("Failed to collect storage metrics", zap.Error(err))
	}

	// Network metrics
	if netMetrics, err := c.collectNetworkMetrics(); err == nil {
		metrics.Network = netMetrics
	} else {
		c.logger.Error("Failed to collect network metrics", zap.Error(err))
	}

	// Load average
	if loadAvg, err := load.Avg(); err == nil {
		metrics.LoadAverage = [3]float64{
			loadAvg.Load1,
			loadAvg.Load5,
			loadAvg.Load15,
		}
	}

	c.metrics = metrics
	return nil
}

func (c *Collector) collectCPUMetrics() (*CPUMetrics, error) {
	times, err := cpu.Times(false)
	if err != nil {
		return nil, err
	}

	if len(times) == 0 {
		return nil, fmt.Errorf("no CPU times available")
	}

	t := times[0]
	total := t.User + t.System + t.Idle + t.Nice + t.Iowait + t.Irq + t.Softirq + t.Steal + t.Guest + t.GuestNice

	counts, err := cpu.Counts(true)
	if err != nil {
		c.logger.Warn("Failed to get CPU counts", zap.Error(err))
	}

	return &CPUMetrics{
		User:    (t.User / total) * 100,
		System:  (t.System / total) * 100,
		Idle:    (t.Idle / total) * 100,
		IOWait:  (t.Iowait / total) * 100,
		Steal:   (t.Steal / total) * 100,
		Total:   100 - ((t.Idle / total) * 100),
		Cores:   int32(counts),
		Threads: int32(counts),
	}, nil
}

func (c *Collector) collectMemoryMetrics() (*MemoryMetrics, error) {
	vmem, err := mem.VirtualMemory()
	if err != nil {
		return nil, err
	}

	swap, err := mem.SwapMemory()
	if err != nil {
		c.logger.Warn("Failed to get swap memory stats", zap.Error(err))
	}

	return &MemoryMetrics{
		Total:     vmem.Total,
		Used:      vmem.Used,
		Free:      vmem.Free,
		Shared:    vmem.Shared,
		Buffers:   vmem.Buffers,
		Cached:    vmem.Cached,
		Available: vmem.Available,
		SwapTotal: swap.Total,
		SwapUsed:  swap.Used,
		SwapFree:  swap.Free,
		Usage:     vmem.UsedPercent,
	}, nil
}

func (c *Collector) collectStorageMetrics() (*StorageMetrics, error) {
	partitions, err := disk.Partitions(false)
	if err != nil {
		return nil, fmt.Errorf("failed to get disk partitions: %w", err)
	}

	var total, used, free uint64
	var partitionErrors []error

	for _, partition := range partitions {
		// Skip special filesystems
		if isSpecialFS(partition.Fstype) {
			continue
		}

		usage, err := disk.Usage(partition.Mountpoint)
		if err != nil {
			partitionErrors = append(partitionErrors, fmt.Errorf("failed to get usage for %s: %w", partition.Mountpoint, err))
			c.logger.Warn("Failed to get partition usage",
				zap.String("mountpoint", partition.Mountpoint),
				zap.Error(err))
			continue
		}

		// Skip partitions with zero total space (might be special filesystems)
		if usage.Total == 0 {
			continue
		}

		total += usage.Total
		used += usage.Used
		free += usage.Free
	}

	// If we couldn't get any partition data, return an error
	if total == 0 {
		if len(partitionErrors) > 0 {
			return nil, fmt.Errorf("failed to get storage metrics: %v", partitionErrors)
		}
		return nil, fmt.Errorf("no valid partitions found")
	}

	metrics := &StorageMetrics{
		Total: total,
		Used:  used,
		Free:  free,
		Usage: float64(used) / float64(total) * 100,
	}

	// Get disk I/O statistics
	diskStats, err := disk.IOCounters()
	if err != nil {
		c.logger.Warn("Failed to get disk I/O stats", zap.Error(err))
		return metrics, nil
	}

	var readCount, writeCount, readBytes, writeBytes, ioTime uint64
	for _, stat := range diskStats {
		readCount += stat.ReadCount
		writeCount += stat.WriteCount
		readBytes += stat.ReadBytes
		writeBytes += stat.WriteBytes
		ioTime += stat.IoTime
	}

	metrics.IOStats = &IOMetrics{
		ReadCount:  readCount,
		WriteCount: writeCount,
		ReadBytes:  readBytes,
		WriteBytes: writeBytes,
		IOTime:     ioTime,
	}

	return metrics, nil
}

func isSpecialFS(fstype string) bool {
	specialFS := map[string]bool{
		"proc":     true,
		"sysfs":    true,
		"devpts":   true,
		"devtmpfs": true,
		"tmpfs":    true,
		"cgroup":   true,
		"cgroup2":  true,
		"pstore":   true,
		"securityfs": true,
		"debugfs":   true,
		"configfs":  true,
		"fusectl":   true,
	}
	return specialFS[fstype]
}

func (c *Collector) collectNetworkMetrics() (*NetMetrics, error) {
	interfaces, err := net.Interfaces()
	if err != nil {
		return nil, err
	}

	counters, err := net.IOCounters(false)
	if err != nil {
		return nil, err
	}

	conns, err := net.Connections("all")
	if err != nil {
		c.logger.Warn("Failed to get network connections", zap.Error(err))
	}

	metrics := &NetMetrics{
		Interfaces: len(interfaces),
	}

	// Aggregate network interface statistics
	for _, counter := range counters {
		metrics.BytesSent += counter.BytesSent
		metrics.BytesRecv += counter.BytesRecv
		metrics.PacketsSent += counter.PacketsSent
		metrics.PacketsRecv += counter.PacketsRecv
		metrics.ErrorsIn += counter.Errin
		metrics.ErrorsOut += counter.Errout
		metrics.DropsIn += counter.Dropin
		metrics.DropsOut += counter.Dropout
	}

	// Count connections by type
	for _, conn := range conns {
		metrics.Connections++
		switch conn.Type {
		case connTypeTCP, connTypeTCP6:
			metrics.TCPConns++
			if conn.Status == connStatusListen {
				metrics.ListenPorts++
			}
		case connTypeUDP, connTypeUDP6:
			metrics.UDPConns++
		}
	}

	return metrics, nil
}

func (c *Collector) HealthCheck(ctx context.Context) error {
	_, err := cpu.Percent(0, false)
	return err
}
