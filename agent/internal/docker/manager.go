package docker

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"time"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/filters"
	"github.com/docker/docker/client"
	"go.uber.org/zap"
)

// ContainerInfo contains container details
type ContainerInfo struct {
	ID      string            `json:"id"`
	Name    string            `json:"name"`
	Image   string            `json:"image"`
	Status  string            `json:"status"`
	State   string            `json:"state"`
	Created time.Time         `json:"created"`
	Ports   []types.Port     `json:"ports"`
	Labels  map[string]string `json:"labels"`
	Mounts  []types.MountPoint `json:"mounts"`
}

// Manager handles Docker operations
type Manager struct {
	client *client.Client
	logger *zap.Logger
}

// NewManager creates a new Docker manager
func NewManager(logger *zap.Logger) (*Manager, error) {
	cli, err := client.NewClientWithOpts(client.FromEnv)
	if err != nil {
		return nil, fmt.Errorf("failed to create Docker client: %w", err)
	}

	return &Manager{
		client: cli,
		logger: logger,
	}, nil
}

// ListContainers returns all containers
func (m *Manager) ListContainers(ctx context.Context, all bool) ([]ContainerInfo, error) {
	containers, err := m.client.ContainerList(ctx, types.ContainerListOptions{All: all})
	if err != nil {
		return nil, fmt.Errorf("failed to list containers: %w", err)
	}

	var infos []ContainerInfo
	for _, c := range containers {
		info := ContainerInfo{
			ID:      c.ID,
			Name:    c.Names[0],
			Image:   c.Image,
			Status:  c.Status,
			State:   c.State,
			Created: time.Unix(c.Created, 0),
			Ports:   c.Ports,
			Labels:  c.Labels,
		}

		// Get detailed info
		details, err := m.client.ContainerInspect(ctx, c.ID)
		if err != nil {
			m.logger.Warn("Failed to inspect container",
				zap.String("id", c.ID),
				zap.Error(err))
		} else {
			info.Mounts = details.Mounts
		}

		infos = append(infos, info)
	}

	return infos, nil
}

// StartContainer starts a container
func (m *Manager) StartContainer(ctx context.Context, id string) error {
	if err := m.client.ContainerStart(ctx, id, types.ContainerStartOptions{}); err != nil {
		return fmt.Errorf("failed to start container: %w", err)
	}
	return nil
}

// StopContainer stops a container
func (m *Manager) StopContainer(ctx context.Context, id string, timeout *int) error {
	if err := m.client.ContainerStop(ctx, id, container.StopOptions{Timeout: timeout}); err != nil {
		return fmt.Errorf("failed to stop container: %w", err)
	}
	return nil
}

// RestartContainer restarts a container
func (m *Manager) RestartContainer(ctx context.Context, id string, timeout *int) error {
	if err := m.client.ContainerRestart(ctx, id, container.StopOptions{Timeout: timeout}); err != nil {
		return fmt.Errorf("failed to restart container: %w", err)
	}
	return nil
}

// GetContainerLogs returns container logs
func (m *Manager) GetContainerLogs(ctx context.Context, id string, tail int) ([]string, error) {
	options := types.ContainerLogsOptions{
		ShowStdout: true,
		ShowStderr: true,
		Timestamps: true,
		Tail:       fmt.Sprintf("%d", tail),
	}

	logs, err := m.client.ContainerLogs(ctx, id, options)
	if err != nil {
		return nil, fmt.Errorf("failed to get container logs: %w", err)
	}
	defer logs.Close()

	var lines []string
	scanner := NewLogScanner(logs)
	for scanner.Scan() {
		lines = append(lines, scanner.Text())
	}

	return lines, scanner.Err()
}

// StreamContainerLogs streams container logs
func (m *Manager) StreamContainerLogs(ctx context.Context, id string, since time.Time, writer io.Writer) error {
	options := types.ContainerLogsOptions{
		ShowStdout: true,
		ShowStderr: true,
		Timestamps: true,
		Follow:     true,
		Since:      since.Format(time.RFC3339),
	}

	logs, err := m.client.ContainerLogs(ctx, id, options)
	if err != nil {
		return fmt.Errorf("failed to get container logs: %w", err)
	}
	defer logs.Close()

	_, err = io.Copy(writer, logs)
	return err
}

// GetContainerStats returns container stats
func (m *Manager) GetContainerStats(ctx context.Context, id string) (*types.StatsJSON, error) {
	stats, err := m.client.ContainerStats(ctx, id, false)
	if err != nil {
		return nil, fmt.Errorf("failed to get container stats: %w", err)
	}
	defer stats.Body.Close()

	var statsJSON types.StatsJSON
	if err := json.NewDecoder(stats.Body).Decode(&statsJSON); err != nil {
		return nil, fmt.Errorf("failed to decode stats: %w", err)
	}

	return &statsJSON, nil
}

// GetImages returns all images
func (m *Manager) GetImages(ctx context.Context) ([]types.ImageSummary, error) {
	images, err := m.client.ImageList(ctx, types.ImageListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list images: %w", err)
	}
	return images, nil
}

// PullImage pulls an image
func (m *Manager) PullImage(ctx context.Context, ref string) error {
	_, err := m.client.ImagePull(ctx, ref, types.ImagePullOptions{})
	if err != nil {
		return fmt.Errorf("failed to pull image: %w", err)
	}
	return nil
}

// RemoveImage removes an image
func (m *Manager) RemoveImage(ctx context.Context, id string, force bool) error {
	_, err := m.client.ImageRemove(ctx, id, types.ImageRemoveOptions{Force: force})
	if err != nil {
		return fmt.Errorf("failed to remove image: %w", err)
	}
	return nil
}

// GetNetworks returns all networks
func (m *Manager) GetNetworks(ctx context.Context) ([]types.NetworkResource, error) {
	networks, err := m.client.NetworkList(ctx, types.NetworkListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list networks: %w", err)
	}
	return networks, nil
}

// GetVolumes returns all volumes
func (m *Manager) GetVolumes(ctx context.Context) ([]*types.Volume, error) {
	volumes, err := m.client.VolumeList(ctx, filters.Args{})
	if err != nil {
		return nil, fmt.Errorf("failed to list volumes: %w", err)
	}
	return volumes.Volumes, nil
}

// Shutdown closes the Docker client
func (m *Manager) Shutdown(ctx context.Context) error {
	return m.client.Close()
}

// HealthCheck implements the health.Checker interface
func (m *Manager) HealthCheck(ctx context.Context) error {
	_, err := m.client.Ping(ctx)
	if err != nil {
		return fmt.Errorf("Docker daemon not responding: %w", err)
	}
	return nil
}
