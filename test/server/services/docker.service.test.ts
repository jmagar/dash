import { DockerService } from '../../../src/server/services/docker.service';
import { getAgentService } from '../../../src/server/services/agent.service';
import { DockerContainerCreateOptions } from '../../../src/server/services/docker.types';
import { ApiError } from '../../../src/types/error';

jest.mock('../../../src/server/services/agent.service');

describe('DockerService', () => {
  let dockerService: DockerService;
  let mockAgentService: jest.Mocked<ReturnType<typeof getAgentService>>;

  beforeEach(() => {
    mockAgentService = {
      executeCommand: jest.fn(),
    } as any;
    (getAgentService as jest.Mock).mockReturnValue(mockAgentService);
    dockerService = new DockerService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMetrics', () => {
    const mockHostId = 'test-host-1';
    const mockDockerInfo = {
      Containers: 5,
      ContainersRunning: 3,
      ContainersPaused: 0,
      ContainersStopped: 2,
      Images: 10,
      MemTotal: 8589934592,
      NCPU: 4,
      ServerVersion: '20.10.17',
    };

    it('should return Docker metrics successfully', async () => {
      mockAgentService.executeCommand.mockResolvedValue({
        stdout: JSON.stringify(mockDockerInfo),
        stderr: '',
        exitCode: 0,
      });

      const metrics = await dockerService.getMetrics(mockHostId);

      expect(mockAgentService.executeCommand).toHaveBeenCalledWith(
        mockHostId,
        'docker info --format "{{json .}}"'
      );

      expect(metrics).toEqual({
        containers: mockDockerInfo.Containers,
        containersRunning: mockDockerInfo.ContainersRunning,
        containersPaused: mockDockerInfo.ContainersPaused,
        containersStopped: mockDockerInfo.ContainersStopped,
        images: mockDockerInfo.Images,
        memoryLimit: mockDockerInfo.MemTotal,
        cpuTotal: mockDockerInfo.NCPU,
        version: mockDockerInfo.ServerVersion,
      });
    });

    it('should handle errors when getting metrics', async () => {
      const errorMessage = 'Failed to get Docker info';
      mockAgentService.executeCommand.mockRejectedValue(new Error(errorMessage));

      await expect(dockerService.getMetrics(mockHostId)).rejects.toThrow(ApiError);
    });
  });

  describe('listContainers', () => {
    const mockHostId = 'test-host-1';
    const mockContainers = [
      {
        ID: 'container1',
        Names: 'test-container-1',
        Image: 'nginx:latest',
        Status: 'Up 2 hours',
        State: 'running',
        CreatedAt: '2023-01-01 12:00:00',
        Ports: '0.0.0.0:80->80/tcp',
        Networks: 'bridge',
      },
    ];

    it('should list containers successfully', async () => {
      mockAgentService.executeCommand.mockResolvedValue({
        stdout: mockContainers.map(container => JSON.stringify(container)).join('\n'),
        stderr: '',
        exitCode: 0,
      });

      const containers = await dockerService.listContainers(mockHostId);

      expect(mockAgentService.executeCommand).toHaveBeenCalledWith(
        mockHostId,
        'docker ps --format "{{json .}}"'
      );

      expect(containers).toEqual([
        {
          id: mockContainers[0].ID,
          name: mockContainers[0].Names,
          image: mockContainers[0].Image,
          status: mockContainers[0].Status,
          state: mockContainers[0].State,
          created: mockContainers[0].CreatedAt,
          ports: dockerService['parsePorts'](mockContainers[0].Ports),
          networks: [mockContainers[0].Networks],
          mounts: [],
          labels: {},
        },
      ]);
    });

    it('should handle errors when listing containers', async () => {
      const errorMessage = 'Failed to list containers';
      mockAgentService.executeCommand.mockRejectedValue(new Error(errorMessage));

      await expect(dockerService.listContainers(mockHostId)).rejects.toThrow(ApiError);
    });
  });

  describe('createContainer', () => {
    const mockHostId = 'test-host-1';
    const mockContainerId = 'new-container-1';
    const mockCreateOptions: DockerContainerCreateOptions = {
      Image: 'nginx:latest',
      name: 'test-nginx',
      Env: ['NGINX_PORT=80'],
      HostConfig: {
        Binds: ['/host/path:/container/path'],
        PortBindings: {
          '80/tcp': [{ HostPort: '8080' }],
        },
        RestartPolicy: {
          Name: 'always',
        },
      },
      Cmd: ['nginx', '-g', 'daemon off;'],
    };

    it('should create container successfully', async () => {
      mockAgentService.executeCommand.mockResolvedValue({
        stdout: mockContainerId,
        stderr: '',
        exitCode: 0,
      });

      const result = await dockerService.createContainer(mockHostId, mockCreateOptions);

      expect(mockAgentService.executeCommand).toHaveBeenCalledWith(
        mockHostId,
        'docker',
        expect.arrayContaining([
          'create',
          '--name', 'test-nginx',
          '-e', 'NGINX_PORT=80',
          '-v', '/host/path:/container/path',
          '-p', '8080:80/tcp',
          '--restart', 'always',
          'nginx:latest',
          'nginx', '-g', 'daemon off;',
        ])
      );

      expect(result).toEqual({ id: mockContainerId });
    });

    it('should handle errors when creating container', async () => {
      const errorMessage = 'Failed to create container';
      mockAgentService.executeCommand.mockRejectedValue(new Error(errorMessage));

      await expect(dockerService.createContainer(mockHostId, mockCreateOptions)).rejects.toThrow(ApiError);
    });
  });

  describe('container operations', () => {
    const mockHostId = 'test-host-1';
    const mockContainerId = 'test-container-1';

    describe('startContainer', () => {
      it('should start container successfully', async () => {
        mockAgentService.executeCommand.mockResolvedValue({
          stdout: '',
          stderr: '',
          exitCode: 0,
        });

        await dockerService.startContainer(mockHostId, mockContainerId);

        expect(mockAgentService.executeCommand).toHaveBeenCalledWith(
          mockHostId,
          'docker',
          ['start', mockContainerId]
        );
      });

      it('should handle errors when starting container', async () => {
        const errorMessage = 'Failed to start container';
        mockAgentService.executeCommand.mockRejectedValue(new Error(errorMessage));

        await expect(dockerService.startContainer(mockHostId, mockContainerId)).rejects.toThrow(ApiError);
      });
    });

    describe('stopContainer', () => {
      it('should stop container successfully', async () => {
        mockAgentService.executeCommand.mockResolvedValue({
          stdout: '',
          stderr: '',
          exitCode: 0,
        });

        await dockerService.stopContainer(mockHostId, mockContainerId);

        expect(mockAgentService.executeCommand).toHaveBeenCalledWith(
          mockHostId,
          'docker',
          ['stop', mockContainerId]
        );
      });

      it('should handle errors when stopping container', async () => {
        const errorMessage = 'Failed to stop container';
        mockAgentService.executeCommand.mockRejectedValue(new Error(errorMessage));

        await expect(dockerService.stopContainer(mockHostId, mockContainerId)).rejects.toThrow(ApiError);
      });
    });

    describe('removeContainer', () => {
      it('should remove container successfully', async () => {
        mockAgentService.executeCommand.mockResolvedValue({
          stdout: '',
          stderr: '',
          exitCode: 0,
        });

        await dockerService.removeContainer(mockHostId, mockContainerId);

        expect(mockAgentService.executeCommand).toHaveBeenCalledWith(
          mockHostId,
          'docker',
          ['rm', mockContainerId]
        );
      });

      it('should remove container with force option', async () => {
        mockAgentService.executeCommand.mockResolvedValue({
          stdout: '',
          stderr: '',
          exitCode: 0,
        });

        await dockerService.removeContainer(mockHostId, mockContainerId, true);

        expect(mockAgentService.executeCommand).toHaveBeenCalledWith(
          mockHostId,
          'docker',
          ['rm', '-f', mockContainerId]
        );
      });

      it('should handle errors when removing container', async () => {
        const errorMessage = 'Failed to remove container';
        mockAgentService.executeCommand.mockRejectedValue(new Error(errorMessage));

        await expect(dockerService.removeContainer(mockHostId, mockContainerId)).rejects.toThrow(ApiError);
      });
    });
  });

  describe('parsePorts', () => {
    it('should parse port mappings correctly', () => {
      const testCases = [
        {
          input: '0.0.0.0:80->80/tcp',
          expected: [{
            IP: '0.0.0.0',
            PrivatePort: 80,
            PublicPort: 80,
            Type: 'tcp',
          }],
        },
        {
          input: '80/tcp',
          expected: [{
            PrivatePort: 80,
            Type: 'tcp',
          }],
        },
        {
          input: '',
          expected: [],
        },
        {
          input: '0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp',
          expected: [
            {
              IP: '0.0.0.0',
              PrivatePort: 80,
              PublicPort: 80,
              Type: 'tcp',
            },
            {
              IP: '0.0.0.0',
              PrivatePort: 443,
              PublicPort: 443,
              Type: 'tcp',
            },
          ],
        },
      ];

      testCases.forEach(({ input, expected }) => {
        expect(dockerService['parsePorts'](input)).toEqual(expected);
      });
    });
  });
});