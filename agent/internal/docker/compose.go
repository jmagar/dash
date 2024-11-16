package docker

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	"github.com/compose-spec/compose-go/loader"
	"github.com/compose-spec/compose-go/types"
	"github.com/docker/cli/cli/command"
	"github.com/docker/cli/cli/flags"
	"github.com/docker/compose/v2/pkg/api"
	"github.com/docker/compose/v2/pkg/compose"
	"go.uber.org/zap"
)

// ComposeProject represents a Docker Compose project
type ComposeProject struct {
	Name       string            `json:"name"`
	ConfigPath string            `json:"config_path"`
	Services   []ComposeService  `json:"services"`
	Networks   []string          `json:"networks"`
	Volumes    []string          `json:"volumes"`
	Variables  map[string]string `json:"variables"`
}

// ComposeService represents a Docker Compose service
type ComposeService struct {
	Name          string            `json:"name"`
	Image         string            `json:"image"`
	ContainerName string            `json:"container_name"`
	Command       []string          `json:"command"`
	Environment   map[string]string `json:"environment"`
	Ports         []string          `json:"ports"`
	Volumes       []string          `json:"volumes"`
	Dependencies  []string          `json:"dependencies"`
	State         string            `json:"state"`
}

// ComposeManager manages Docker Compose operations
type ComposeManager struct {
	service api.Service
	logger  *zap.Logger
}

// NewComposeManager creates a new Docker Compose manager
func NewComposeManager(logger *zap.Logger) (*ComposeManager, error) {
	cli, err := command.NewDockerCli()
	if err != nil {
		return nil, fmt.Errorf("failed to create Docker CLI: %w", err)
	}

	if err := cli.Initialize(flags.NewClientOptions()); err != nil {
		return nil, fmt.Errorf("failed to initialize Docker CLI: %w", err)
	}

	service := compose.NewComposeService(cli)

	return &ComposeManager{
		service: service,
		logger:  logger,
	}, nil
}

// LoadProject loads a Docker Compose project
func (m *ComposeManager) LoadProject(ctx context.Context, configPath string) (*ComposeProject, error) {
	// Load and parse compose file
	configBytes, err := os.ReadFile(configPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read compose file: %w", err)
	}

	config, err := loader.ParseYAML(configBytes)
	if err != nil {
		return nil, fmt.Errorf("failed to parse compose file: %w", err)
	}

	workingDir := filepath.Dir(configPath)
	project, err := loader.Load(types.ConfigDetails{
		WorkingDir: workingDir,
		ConfigFiles: []types.ConfigFile{
			{Filename: configPath, Config: config},
		},
		Environment: map[string]string{},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to load project: %w", err)
	}

	// Create project info
	composeProject := &ComposeProject{
		Name:       project.Name,
		ConfigPath: configPath,
		Networks:   make([]string, 0, len(project.Networks)),
		Volumes:    make([]string, 0, len(project.Volumes)),
		Variables:  project.Environment,
	}

	// Get networks
	for name := range project.Networks {
		composeProject.Networks = append(composeProject.Networks, name)
	}

	// Get volumes
	for name := range project.Volumes {
		composeProject.Volumes = append(composeProject.Volumes, name)
	}

	// Get services
	for _, service := range project.Services {
		composeService := ComposeService{
			Name:          service.Name,
			Image:         service.Image,
			ContainerName: service.ContainerName,
			Command:       service.Command,
			Environment:   service.Environment,
			Ports:        service.Ports,
			Volumes:      service.Volumes,
			Dependencies: service.DependsOn,
		}
		composeProject.Services = append(composeProject.Services, composeService)
	}

	return composeProject, nil
}

// Up starts Docker Compose services
func (m *ComposeManager) Up(ctx context.Context, configPath string, options api.UpOptions) error {
	project, err := m.LoadProject(ctx, configPath)
	if err != nil {
		return err
	}

	return m.service.Up(ctx, project.Name, options)
}

// Down stops Docker Compose services
func (m *ComposeManager) Down(ctx context.Context, configPath string, options api.DownOptions) error {
	project, err := m.LoadProject(ctx, configPath)
	if err != nil {
		return err
	}

	return m.service.Down(ctx, project.Name, options)
}

// Start starts specific services
func (m *ComposeManager) Start(ctx context.Context, configPath string, services []string) error {
	project, err := m.LoadProject(ctx, configPath)
	if err != nil {
		return err
	}

	return m.service.Start(ctx, project.Name, services, api.StartOptions{})
}

// Stop stops specific services
func (m *ComposeManager) Stop(ctx context.Context, configPath string, services []string) error {
	project, err := m.LoadProject(ctx, configPath)
	if err != nil {
		return err
	}

	return m.service.Stop(ctx, project.Name, services, api.StopOptions{})
}

// Restart restarts specific services
func (m *ComposeManager) Restart(ctx context.Context, configPath string, services []string) error {
	project, err := m.LoadProject(ctx, configPath)
	if err != nil {
		return err
	}

	return m.service.Restart(ctx, project.Name, services, api.RestartOptions{})
}

// Pull pulls service images
func (m *ComposeManager) Pull(ctx context.Context, configPath string, services []string) error {
	project, err := m.LoadProject(ctx, configPath)
	if err != nil {
		return err
	}

	return m.service.Pull(ctx, project.Name, api.PullOptions{})
}

// Logs gets service logs
func (m *ComposeManager) Logs(ctx context.Context, configPath string, services []string, options api.LogOptions) (io.ReadCloser, error) {
	project, err := m.LoadProject(ctx, configPath)
	if err != nil {
		return nil, err
	}

	return m.service.Logs(ctx, project.Name, services, options)
}

// PS lists containers
func (m *ComposeManager) PS(ctx context.Context, configPath string, services []string) ([]api.ContainerSummary, error) {
	project, err := m.LoadProject(ctx, configPath)
	if err != nil {
		return nil, err
	}

	return m.service.Ps(ctx, project.Name, api.PsOptions{Services: services})
}

// Events streams events
func (m *ComposeManager) Events(ctx context.Context, configPath string, services []string) (<-chan api.Event, error) {
	project, err := m.LoadProject(ctx, configPath)
	if err != nil {
		return nil, err
	}

	return m.service.Events(ctx, project.Name, api.EventsOptions{Services: services})
}

// ValidateConfig validates a compose file
func (m *ComposeManager) ValidateConfig(configPath string) error {
	_, err := m.LoadProject(context.Background(), configPath)
	return err
}

// IsComposeFile checks if a file is a compose file
func IsComposeFile(path string) bool {
	name := strings.ToLower(filepath.Base(path))
	return strings.HasPrefix(name, "docker-compose") &&
		(strings.HasSuffix(name, ".yml") || strings.HasSuffix(name, ".yaml"))
}
