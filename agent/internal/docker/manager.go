package docker

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"strings"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/filters"
	"github.com/docker/docker/client"
	"go.uber.org/zap"
)

// ContainerEvent represents a Docker container event
type ContainerEvent struct {
	Action   string
	ID       string
	Name     string
	Type     string
	Status   string
	Labels   map[string]string
	TimeNano int64
}

type Manager struct {
	client  *client.Client
	logger  *zap.Logger
	context context.Context
}

func NewManager(logger *zap.Logger) (*Manager, error) {
	cli, err := client.NewClientWithOpts(client.FromEnv)
	if err != nil {
		return nil, fmt.Errorf("failed to create Docker client: %w", err)
	}

	ctx := context.Background()

	return &Manager{
		client:  cli,
		logger:  logger,
		context: ctx,
	}, nil
}

func (m *Manager) ListContainers(ctx context.Context, includeAll bool) ([]types.Container, error) {
	options := types.ContainerListOptions{
		All: includeAll,
	}

	containers, err := m.client.ContainerList(ctx, options)
	if err != nil {
		return nil, fmt.Errorf("failed to list containers: %w", err)
	}

	return containers, nil
}

func (m *Manager) GetContainer(ctx context.Context, id string) (*types.Container, error) {
	containers, err := m.ListContainers(ctx, true)
	if err != nil {
		return nil, err
	}

	for _, container := range containers {
		if container.ID == id {
			return &container, nil
		}
	}

	return nil, fmt.Errorf("container not found: %s", id)
}

func (m *Manager) StartContainer(ctx context.Context, id string) error {
	err := m.client.ContainerStart(ctx, id, types.ContainerStartOptions{})
	if err != nil {
		return fmt.Errorf("failed to start container: %w", err)
	}
	return nil
}

func (m *Manager) StopContainer(ctx context.Context, id string, timeout *int) error {
	options := container.StopOptions{
		Timeout: timeout,
	}
	err := m.client.ContainerStop(ctx, id, options)
	if err != nil {
		return fmt.Errorf("failed to stop container: %w", err)
	}
	return nil
}

func (m *Manager) RestartContainer(ctx context.Context, id string, timeout *int) error {
	err := m.client.ContainerRestart(ctx, id, container.StopOptions{
		Timeout: timeout,
	})
	if err != nil {
		return fmt.Errorf("failed to restart container: %w", err)
	}
	return nil
}

func (m *Manager) RemoveContainer(ctx context.Context, id string, force bool) error {
	options := types.ContainerRemoveOptions{
		Force:         force,
		RemoveVolumes: true,
	}

	err := m.client.ContainerRemove(ctx, id, options)
	if err != nil {
		return fmt.Errorf("failed to remove container: %w", err)
	}
	return nil
}

func (m *Manager) GetContainerLogs(ctx context.Context, id string, tail int) (string, error) {
	options := types.ContainerLogsOptions{
		ShowStdout: true,
		ShowStderr: true,
		Tail:       fmt.Sprintf("%d", tail),
		Follow:     false,
	}

	reader, err := m.client.ContainerLogs(ctx, id, options)
	if err != nil {
		return "", fmt.Errorf("failed to get container logs: %w", err)
	}
	defer reader.Close()

	var logs strings.Builder
	scanner := bufio.NewScanner(reader)
	for scanner.Scan() {
		logs.WriteString(scanner.Text())
		logs.WriteString("\n")
	}

	if err := scanner.Err(); err != nil {
		return "", fmt.Errorf("error reading container logs: %w", err)
	}

	return logs.String(), nil
}

func (m *Manager) PullImage(ctx context.Context, image string) error {
	reader, err := m.client.ImagePull(ctx, image, types.ImagePullOptions{})
	if err != nil {
		return fmt.Errorf("failed to pull image: %w", err)
	}
	defer reader.Close()

	// Read the output to complete the pull
	_, err = io.Copy(io.Discard, reader)
	if err != nil {
		return fmt.Errorf("error reading image pull response: %w", err)
	}

	return nil
}

func (m *Manager) GetContainerStats(ctx context.Context, id string) (*types.StatsJSON, error) {
	stats, err := m.client.ContainerStats(ctx, id, false)
	if err != nil {
		return nil, fmt.Errorf("failed to get container stats: %w", err)
	}
	defer stats.Body.Close()

	var statsJSON types.StatsJSON
	if err := json.NewDecoder(stats.Body).Decode(&statsJSON); err != nil {
		return nil, fmt.Errorf("failed to decode container stats: %w", err)
	}

	return &statsJSON, nil
}

func (m *Manager) GetEvents(ctx context.Context) (<-chan ContainerEvent, <-chan error) {
	eventsChan := make(chan ContainerEvent)
	errChan := make(chan error)

	go func() {
		defer close(eventsChan)
		defer close(errChan)

		options := types.EventsOptions{
			Filters: filters.NewArgs(
				filters.Arg("type", "container"),
			),
		}

		events, errs := m.client.Events(ctx, options)
		for {
			select {
			case event := <-events:
				if event.Type == "container" {
					eventsChan <- ContainerEvent{
						Action:   event.Action,
						ID:       event.Actor.ID,
						Name:     event.Actor.Attributes["name"],
						Type:     event.Type,
						Status:   event.Status,
						Labels:   event.Actor.Attributes,
						TimeNano: event.TimeNano,
					}
				}
			case err := <-errs:
				if err != nil {
					errChan <- fmt.Errorf("error receiving Docker events: %w", err)
				}
				return
			case <-ctx.Done():
				return
			}
		}
	}()

	return eventsChan, errChan
}

func (m *Manager) HealthCheck(ctx context.Context) error {
	_, err := m.client.Ping(ctx)
	if err != nil {
		return fmt.Errorf("docker health check failed: %w", err)
	}
	return nil
}

func (m *Manager) Shutdown(ctx context.Context) error {
	return m.client.Close()
}
