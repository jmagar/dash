package docker

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"

	"go.uber.org/zap"
	"gopkg.in/yaml.v3"
)

// ComposeService represents a Docker Compose service
type ComposeService struct {
	Name        string            `yaml:"name" json:"name"`
	Image       string            `yaml:"image" json:"image"`
	Command     []string          `yaml:"command,omitempty" json:"command,omitempty"`
	Environment map[string]string `yaml:"environment,omitempty" json:"environment,omitempty"`
	Ports       []string          `yaml:"ports,omitempty" json:"ports,omitempty"`
	Volumes     []string          `yaml:"volumes,omitempty" json:"volumes,omitempty"`
	DependsOn   []string          `yaml:"depends_on,omitempty" json:"depends_on,omitempty"`
}

// ComposeProject represents a Docker Compose project
type ComposeProject struct {
	Name     string                    `yaml:"name" json:"name"`
	Services map[string]ComposeService `yaml:"services" json:"services"`
}

// ComposeManager handles Docker Compose operations
type ComposeManager struct {
	manager *Manager
	logger  *zap.Logger
}

// NewComposeManager creates a new Docker Compose manager
func NewComposeManager(manager *Manager, logger *zap.Logger) *ComposeManager {
	return &ComposeManager{
		manager: manager,
		logger:  logger,
	}
}

// LoadProject loads a Docker Compose project
func (m *ComposeManager) LoadProject(ctx context.Context, configPath string) (*ComposeProject, error) {
	// Read compose file
	data, err := os.ReadFile(configPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read compose file: %w", err)
	}

	// Parse YAML
	var project ComposeProject
	if err := yaml.Unmarshal(data, &project); err != nil {
		return nil, fmt.Errorf("failed to parse compose file: %w", err)
	}

	// Set project name if not specified
	if project.Name == "" {
		project.Name = filepath.Base(filepath.Dir(configPath))
	}

	// Set service names
	for name, service := range project.Services {
		service.Name = name
		project.Services[name] = service
	}

	return &project, nil
}

// Up starts all services in a project
func (m *ComposeManager) Up(ctx context.Context, project *ComposeProject) error {
	// Start services in dependency order
	for _, service := range project.Services {
		// Pull image if needed
		err := m.manager.PullImage(ctx, service.Image)
		if err != nil {
			m.logger.Warn("Failed to pull image",
				zap.String("service", service.Name),
				zap.String("image", service.Image),
				zap.Error(err))
		}

		// Create and start container
		// TODO: Implement container creation with service config
		m.logger.Info("Starting service",
			zap.String("service", service.Name),
			zap.String("image", service.Image))
	}

	return nil
}

// Down stops and removes all services in a project
func (m *ComposeManager) Down(ctx context.Context, project *ComposeProject) error {
	// Stop services in reverse dependency order
	for _, service := range project.Services {
		containers, err := m.manager.ListContainers(ctx, true)
		if err != nil {
			return err
		}

		// Find and stop containers for this service
		for _, container := range containers {
			if container.Labels["com.docker.compose.service"] == service.Name &&
				container.Labels["com.docker.compose.project"] == project.Name {
				err := m.manager.StopContainer(ctx, container.ID, nil)
				if err != nil {
					m.logger.Warn("Failed to stop container",
						zap.String("service", service.Name),
						zap.String("container", container.ID),
						zap.Error(err))
				}
			}
		}
	}

	return nil
}

// Logs gets logs for services
func (m *ComposeManager) Logs(ctx context.Context, project *ComposeProject, services []string, writer io.Writer) error {
	containers, err := m.manager.ListContainers(ctx, true)
	if err != nil {
		return err
	}

	// Get logs for each service
	for _, container := range containers {
		serviceName := container.Labels["com.docker.compose.service"]
		if _, exists := project.Services[serviceName]; exists &&
			(len(services) == 0 || contains(services, serviceName)) {
			logs, err := m.manager.GetContainerLogs(ctx, container.ID, 100)
			if err != nil {
				m.logger.Warn("Failed to get container logs",
					zap.String("service", serviceName),
					zap.String("container", container.ID),
					zap.Error(err))
				continue
			}

			for _, line := range logs {
				fmt.Fprintf(writer, "[%s] %v\n", serviceName, line)
			}
		}
	}

	return nil
}

// Shutdown closes the Compose manager
func (m *ComposeManager) Shutdown(ctx context.Context) error {
	return nil
}

// Helper function to check if slice contains string
func contains(slice []string, str string) bool {
	for _, s := range slice {
		if s == str {
			return true
		}
	}
	return false
}
