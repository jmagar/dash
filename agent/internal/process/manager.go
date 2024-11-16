package process

import (
	"context"
	"fmt"
	"os/exec"
	"sync"
	"time"

	"github.com/shirou/gopsutil/v3/process"
	"go.uber.org/zap"
)

type ProcessState string

const (
	ProcessStateStarting ProcessState = "starting"
	ProcessStateRunning ProcessState = "running"
	ProcessStateStopped ProcessState = "stopped"
	ProcessStateFailed  ProcessState = "failed"
)

type ProcessInfo struct {
	PID       int32     `json:"pid"`
	PPID      int32     `json:"ppid"`
	Name      string    `json:"name"`
	Username  string    `json:"username"`
	Status    string    `json:"status"`
	CPU       float64   `json:"cpu"`
	Memory    float64   `json:"memory"`
	RSS       uint64    `json:"rss"`
	VMS       uint64    `json:"vms"`
	Threads   int32     `json:"threads"`
	FDs       int32     `json:"fds,omitempty"`
	Created   time.Time `json:"created"`
	CmdLine   string    `json:"cmdline"`
	ExePath   string    `json:"exe,omitempty"`
	Terminal  string    `json:"terminal,omitempty"`
	Priority  int32     `json:"priority,omitempty"`
	Nice      int32     `json:"nice,omitempty"`
	IOStats   *IOStats  `json:"io_stats,omitempty"`
	NumProcs  int32     `json:"num_procs,omitempty"`
	PageFault *PageFaultStats `json:"page_fault,omitempty"`
}

type IOStats struct {
	ReadCount  uint64 `json:"read_count"`
	WriteCount uint64 `json:"write_count"`
	ReadBytes  uint64 `json:"read_bytes"`
	WriteBytes uint64 `json:"write_bytes"`
}

type PageFaultStats struct {
	MinorFaults uint64 `json:"minor_faults"`
	MajorFaults uint64 `json:"major_faults"`
}

type ExecuteResult struct {
	ExitCode int    `json:"exit_code"`
	Stdout   string `json:"stdout"`
	Stderr   string `json:"stderr"`
}

type Manager struct {
	logger *zap.Logger
	mu     sync.RWMutex
	procs  map[int32]*process.Process
	ctx    context.Context
	cancel context.CancelFunc
}

func NewManager(logger *zap.Logger) *Manager {
	ctx, cancel := context.WithCancel(context.Background())
	return &Manager{
		logger: logger,
		procs:  make(map[int32]*process.Process),
		ctx:    ctx,
		cancel: cancel,
	}
}

func (m *Manager) Start(ctx context.Context) error {
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-ticker.C:
			if err := m.updateProcessList(); err != nil {
				m.logger.Error("Failed to update process list", zap.Error(err))
			}
		}
	}
}

func (m *Manager) Shutdown(ctx context.Context) error {
	m.cancel()
	return nil
}

func (m *Manager) Execute(ctx context.Context, command string, args []string) (*ExecuteResult, error) {
	cmd := exec.CommandContext(ctx, command, args...)

	// Capture stdout and stderr
	stdout, err := cmd.Output()
	if err != nil {
		var stderr string
		if exitErr, ok := err.(*exec.ExitError); ok {
			stderr = string(exitErr.Stderr)
		}
		return &ExecuteResult{
			ExitCode: 1,
			Stdout:   string(stdout),
			Stderr:   stderr,
		}, err
	}

	return &ExecuteResult{
		ExitCode: 0,
		Stdout:   string(stdout),
		Stderr:   "",
	}, nil
}

func (m *Manager) updateProcessList() error {
	procs, err := process.Processes()
	if err != nil {
		return fmt.Errorf("failed to get processes: %w", err)
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	// Clear old processes
	m.procs = make(map[int32]*process.Process)

	// Update with new processes
	for _, p := range procs {
		m.procs[p.Pid] = p
	}

	return nil
}

func (m *Manager) GetProcesses() ([]ProcessInfo, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	var processes []ProcessInfo
	for _, p := range m.procs {
		info, err := m.getProcessInfo(p)
		if err != nil {
			m.logger.Error("Failed to get process info",
				zap.Int32("pid", p.Pid),
				zap.Error(err))
			continue
		}
		processes = append(processes, info)
	}

	return processes, nil
}

func (m *Manager) getProcessInfo(p *process.Process) (ProcessInfo, error) {
	info := ProcessInfo{
		PID: p.Pid,
	}

	// Basic info
	if ppid, err := p.Ppid(); err == nil {
		info.PPID = ppid
	}
	if name, err := p.Name(); err == nil {
		info.Name = name
	}
	if username, err := p.Username(); err == nil {
		info.Username = username
	}
	if status, err := p.Status(); err == nil && len(status) > 0 {
		info.Status = status[0]
	}
	if cpu, err := p.CPUPercent(); err == nil {
		info.CPU = cpu
	}
	if mem, err := p.MemoryPercent(); err == nil {
		info.Memory = float64(mem)
	}
	if memInfo, err := p.MemoryInfo(); err == nil && memInfo != nil {
		info.RSS = memInfo.RSS
		info.VMS = memInfo.VMS
	}
	if threads, err := p.NumThreads(); err == nil {
		info.Threads = threads
	}
	if fds, err := p.NumFDs(); err == nil {
		info.FDs = fds
	}
	if created, err := p.CreateTime(); err == nil {
		info.Created = time.Unix(created/1000, 0)
	}
	if cmdline, err := p.Cmdline(); err == nil {
		info.CmdLine = cmdline
	}
	if exe, err := p.Exe(); err == nil {
		info.ExePath = exe
	}
	if terminal, err := p.Terminal(); err == nil {
		info.Terminal = terminal
	}
	if nice, err := p.Nice(); err == nil {
		info.Nice = nice
	}

	// IO stats
	if ioStats, err := p.IOCounters(); err == nil && ioStats != nil {
		info.IOStats = &IOStats{
			ReadCount:  ioStats.ReadCount,
			WriteCount: ioStats.WriteCount,
			ReadBytes:  ioStats.ReadBytes,
			WriteBytes: ioStats.WriteBytes,
		}
	}

	// Page faults
	if pageFault, err := p.PageFaults(); err == nil && pageFault != nil {
		info.PageFault = &PageFaultStats{
			MinorFaults: pageFault.MinorFaults,
			MajorFaults: pageFault.MajorFaults,
		}
	}

	return info, nil
}

func (m *Manager) KillProcess(pid int32, signal string) error {
	m.mu.RLock()
	p, exists := m.procs[pid]
	m.mu.RUnlock()

	if !exists {
		return fmt.Errorf("process %d not found", pid)
	}

	if err := p.Kill(); err != nil {
		return fmt.Errorf("failed to kill process %d: %w", pid, err)
	}

	return nil
}

func (m *Manager) HealthCheck(ctx context.Context) error {
	_, err := m.GetProcesses()
	return err
}
