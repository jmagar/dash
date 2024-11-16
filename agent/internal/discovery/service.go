package discovery

import (
	"context"
	"fmt"
	"net"
	"os"
	"sync"
	"time"

	"go.uber.org/zap"
	"strings"
)

// Service represents the service discovery component
type Service struct {
	logger     *zap.Logger
	mu         sync.RWMutex
	services   map[string]*ServiceInfo
	scanConfig ScanConfig
}

// ServiceInfo represents information about a discovered service
type ServiceInfo struct {
	Name        string
	Type        string
	Port        int
	Version     string
	Status      string
	LastSeen    time.Time
	Metadata    map[string]interface{}
}

// ScanConfig represents service discovery scan configuration
type ScanConfig struct {
	Interval  time.Duration
	PortRange string
	Timeout   time.Duration
}

// NewService creates a new service discovery instance
func NewService(logger *zap.Logger) *Service {
	return &Service{
		logger:   logger,
		services: make(map[string]*ServiceInfo),
		scanConfig: ScanConfig{
			Interval:  5 * time.Minute,
			PortRange: "1-65535",
			Timeout:  5 * time.Second,
		},
	}
}

// Start begins the service discovery process
func (s *Service) Start(ctx context.Context) error {
	s.logger.Info("Starting service discovery")
	
	// Start periodic scanning
	go func() {
		ticker := time.NewTicker(s.scanConfig.Interval)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				s.logger.Info("Stopping service discovery")
				return
			case <-ticker.C:
				if err := s.scan(ctx); err != nil {
					s.logger.Error("Service discovery scan failed", zap.Error(err))
				}
			}
		}
	}()

	return nil
}

// scan performs a single service discovery scan
func (s *Service) scan(ctx context.Context) error {
	s.logger.Debug("Starting service discovery scan")

	// Get list of network interfaces
	ifaces, err := net.Interfaces()
	if err != nil {
		return fmt.Errorf("failed to get network interfaces: %w", err)
	}

	// Scan each interface
	for _, iface := range ifaces {
		// Skip loopback and down interfaces
		if iface.Flags&net.FlagLoopback != 0 || iface.Flags&net.FlagUp == 0 {
			continue
		}

		addrs, err := iface.Addrs()
		if err != nil {
			s.logger.Error("Failed to get interface addresses",
				zap.String("interface", iface.Name),
				zap.Error(err))
			continue
		}

		for _, addr := range addrs {
			ipNet, ok := addr.(*net.IPNet)
			if !ok || ipNet.IP.IsLoopback() {
				continue
			}

			// Scan the network
			if err := s.scanNetwork(ctx, ipNet); err != nil {
				s.logger.Error("Network scan failed",
					zap.String("network", ipNet.String()),
					zap.Error(err))
			}
		}
	}

	return nil
}

// scanNetwork scans a specific network for services
func (s *Service) scanNetwork(ctx context.Context, network *net.IPNet) error {
	// Implementation of network scanning logic
	// This is a placeholder for actual implementation
	return nil
}

// GetServices returns all discovered services
func (s *Service) GetServices() map[string]*ServiceInfo {
	s.mu.RLock()
	defer s.mu.RUnlock()

	// Create a copy to avoid external modifications
	services := make(map[string]*ServiceInfo, len(s.services))
	for k, v := range s.services {
		serviceCopy := *v
		services[k] = &serviceCopy
	}

	return services
}

// UpdateService updates or adds a service
func (s *Service) UpdateService(info *ServiceInfo) {
	s.mu.Lock()
	defer s.mu.Unlock()

	key := fmt.Sprintf("%s-%d", info.Name, info.Port)
	s.services[key] = info
}

// RemoveService removes a service
func (s *Service) RemoveService(name string, port int) {
	s.mu.Lock()
	defer s.mu.Unlock()

	key := fmt.Sprintf("%s-%d", name, port)
	delete(s.services, key)
}

// Configure updates the scan configuration
func (s *Service) Configure(config ScanConfig) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.scanConfig = config
}

// detectServiceType attempts to determine the type of service
func (s *Service) detectServiceType(host string, port int) (string, error) {
	conn, err := net.DialTimeout("tcp", fmt.Sprintf("%s:%d", host, port), s.scanConfig.Timeout)
	if err != nil {
		return "", err
	}
	defer conn.Close()

	// Send a probe request
	_, err = conn.Write([]byte("PROBE\r\n"))
	if err != nil {
		return "", err
	}

	// Read response
	buffer := make([]byte, 1024)
	_ = conn.SetReadDeadline(time.Now().Add(s.scanConfig.Timeout))
	n, err := conn.Read(buffer)
	if err != nil {
		return "", err
	}

	response := string(buffer[:n])
	return s.identifyService(response), nil
}

// identifyService identifies the service type based on the response
func (s *Service) identifyService(response string) string {
	// This is a simple pattern matching system
	// In a real implementation, this would be more sophisticated
	switch {
	case containsAny(response, "SSH", "OpenSSH"):
		return "SSH"
	case containsAny(response, "HTTP", "nginx", "Apache"):
		return "HTTP"
	case containsAny(response, "MySQL", "MariaDB"):
		return "MySQL"
	case containsAny(response, "Redis"):
		return "Redis"
	case containsAny(response, "MongoDB"):
		return "MongoDB"
	default:
		return "Unknown"
	}
}

// containsAny checks if the string contains any of the patterns
func containsAny(s string, patterns ...string) bool {
	for _, pattern := range patterns {
		if strings.Contains(s, pattern) {
			return true
		}
	}
	return false
}

// getServiceVersion attempts to determine the version of a service
func (s *Service) getServiceVersion(host string, port int, serviceType string) (string, error) {
	// Implementation of version detection logic
	// This is a placeholder for actual implementation
	return "unknown", nil
}
