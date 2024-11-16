package system

import (
	"fmt"
	"os"
	"os/exec"
	"runtime"
	"strings"

	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/host"
	"github.com/shirou/gopsutil/v3/mem"
)

// SystemInfo contains detailed system information
type SystemInfo struct {
	Hostname     string            `json:"hostname"`
	Platform     string            `json:"platform"`
	OS           string            `json:"os"`
	Version      string            `json:"version"`
	Architecture string            `json:"architecture"`
	CPUInfo      []CPU            `json:"cpu_info"`
	MemoryInfo   Memory           `json:"memory_info"`
	Environment  map[string]string `json:"environment"`
	Capabilities []string          `json:"capabilities"`
}

// CPU contains CPU information
type CPU struct {
	Model     string  `json:"model"`
	Cores     int32   `json:"cores"`
	Frequency float64 `json:"frequency_mhz"`
	Cache     int32   `json:"cache_size_kb"`
}

// Memory contains memory information
type Memory struct {
	Total     uint64 `json:"total"`
	Available uint64 `json:"available"`
	Used      uint64 `json:"used"`
	Free      uint64 `json:"free"`
	SwapTotal uint64 `json:"swap_total"`
	SwapUsed  uint64 `json:"swap_used"`
	SwapFree  uint64 `json:"swap_free"`
}

// GetSystemInfo gathers detailed system information
func GetSystemInfo() (*SystemInfo, error) {
	info := &SystemInfo{
		Architecture: runtime.GOARCH,
		Environment:  make(map[string]string),
		Capabilities: []string{
			"exec",
			"metrics",
			"health",
			"file_transfer",
		},
	}

	// Get hostname
	hostname, err := os.Hostname()
	if err != nil {
		return nil, fmt.Errorf("failed to get hostname: %w", err)
	}
	info.Hostname = hostname

	// Get host info
	hostInfo, err := host.Info()
	if err != nil {
		return nil, fmt.Errorf("failed to get host info: %w", err)
	}
	info.Platform = hostInfo.Platform
	info.OS = hostInfo.OS
	info.Version = hostInfo.PlatformVersion

	// Get CPU info
	cpuInfo, err := cpu.Info()
	if err != nil {
		return nil, fmt.Errorf("failed to get CPU info: %w", err)
	}

	for _, cpu := range cpuInfo {
		info.CPUInfo = append(info.CPUInfo, CPU{
			Model:     cpu.ModelName,
			Cores:     cpu.Cores,
			Frequency: cpu.Mhz,
			Cache:     cpu.CacheSize,
		})
	}

	// Get memory info
	memInfo, err := mem.VirtualMemory()
	if err != nil {
		return nil, fmt.Errorf("failed to get memory info: %w", err)
	}

	swapInfo, err := mem.SwapMemory()
	if err != nil {
		return nil, fmt.Errorf("failed to get swap info: %w", err)
	}

	info.MemoryInfo = Memory{
		Total:     memInfo.Total,
		Available: memInfo.Available,
		Used:      memInfo.Used,
		Free:      memInfo.Free,
		SwapTotal: swapInfo.Total,
		SwapUsed:  swapInfo.Used,
		SwapFree:  swapInfo.Free,
	}

	// Get additional OS-specific information
	switch runtime.GOOS {
	case "linux":
		if err := getLinuxInfo(info); err != nil {
			return nil, err
		}
	case "darwin":
		if err := getDarwinInfo(info); err != nil {
			return nil, err
		}
	case "windows":
		if err := getWindowsInfo(info); err != nil {
			return nil, err
		}
	}

	// Get environment variables
	for _, env := range os.Environ() {
		parts := strings.SplitN(env, "=", 2)
		if len(parts) == 2 {
			// Filter sensitive environment variables
			if !isSensitiveEnv(parts[0]) {
				info.Environment[parts[0]] = parts[1]
			}
		}
	}

	return info, nil
}

// getLinuxInfo gathers Linux-specific information
func getLinuxInfo(info *SystemInfo) error {
	// Get Linux distribution info
	if output, err := exec.Command("lsb_release", "-a").Output(); err == nil {
		lines := strings.Split(string(output), "\n")
		for _, line := range lines {
			parts := strings.SplitN(line, ":", 2)
			if len(parts) == 2 {
				key := strings.TrimSpace(parts[0])
				value := strings.TrimSpace(parts[1])
				switch key {
				case "Description":
					info.OS = value
				case "Release":
					info.Version = value
				}
			}
		}
	}

	// Add Linux-specific capabilities
	info.Capabilities = append(info.Capabilities,
		"systemd",
		"cgroups",
		"namespaces",
	)

	return nil
}

// getDarwinInfo gathers macOS-specific information
func getDarwinInfo(info *SystemInfo) error {
	// Get macOS version
	if output, err := exec.Command("sw_vers", "-productVersion").Output(); err == nil {
		info.Version = strings.TrimSpace(string(output))
	}

	// Add macOS-specific capabilities
	info.Capabilities = append(info.Capabilities,
		"launchd",
		"sandbox",
	)

	return nil
}

// getWindowsInfo gathers Windows-specific information
func getWindowsInfo(info *SystemInfo) error {
	// Get Windows version
	if output, err := exec.Command("ver").Output(); err == nil {
		info.Version = strings.TrimSpace(string(output))
	}

	// Add Windows-specific capabilities
	info.Capabilities = append(info.Capabilities,
		"services",
		"registry",
	)

	return nil
}

// isSensitiveEnv returns true if the environment variable name is sensitive
func isSensitiveEnv(name string) bool {
	sensitive := []string{
		"PASSWORD",
		"SECRET",
		"KEY",
		"TOKEN",
		"CREDENTIAL",
		"AUTH",
	}

	name = strings.ToUpper(name)
	for _, s := range sensitive {
		if strings.Contains(name, s) {
			return true
		}
	}

	return false
}
