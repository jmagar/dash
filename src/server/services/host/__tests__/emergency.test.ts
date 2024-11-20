import { EmergencyService } from '../emergency';
import { Client as SSHClient } from 'ssh2';
import { BaseService } from '../../base.service';
import { db } from '../../../db';
import type { Host } from '../../../../types/host';

// Mock dependencies
jest.mock('../../../db');
jest.mock('ssh2');
jest.mock('../../base.service');

describe('EmergencyService', () => {
  let service: EmergencyService;
  let mockHost: Host;
  let mockSSH: jest.Mocked<SSHClient>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock host
    mockHost = {
      id: 'test-host',
      hostname: 'test.example.com',
      username: 'testuser',
      state: 'active'
    } as Host;

    // Setup mock SSH client
    mockSSH = {
      exec: jest.fn(),
    } as unknown as jest.Mocked<SSHClient>;

    // Setup mock db
    (db.hosts.findById as jest.Mock).mockResolvedValue(mockHost);

    // Setup mock BaseService
    (BaseService.prototype.withSSH as jest.Mock).mockImplementation(
      async (_host, operation) => operation(mockSSH)
    );

    service = new EmergencyService();
  });

  describe('restart', () => {
    it('should restart agent via systemctl', async () => {
      // Setup successful systemctl restart
      mockSSH.exec.mockImplementation((cmd, cb) => {
        if (cmd.includes('systemctl restart')) {
          cb(null, {
            on: (event: string, handler: Function) => {
              if (event === 'close') handler(0);
            }
          } as any);
        }
        return {} as any;
      });

      const result = await service.restart('test-host');

      expect(result.success).toBe(true);
      expect(result.state).toBe('maintenance');
      expect(mockSSH.exec).toHaveBeenCalledWith(
        'sudo systemctl restart shh-agent',
        expect.any(Function)
      );
    });

    it('should fallback to process kill if systemctl fails', async () => {
      // Setup failed systemctl but successful pkill
      let commandCount = 0;
      mockSSH.exec.mockImplementation((cmd, cb) => {
        if (cmd.includes('systemctl restart')) {
          cb(new Error('systemctl failed'), null);
        } else {
          cb(null, {
            on: (event: string, handler: Function) => {
              if (event === 'close') handler(0);
              commandCount++;
            }
          } as any);
        }
        return {} as any;
      });

      const result = await service.restart('test-host');

      expect(result.success).toBe(true);
      expect(result.state).toBe('maintenance');
      expect(mockSSH.exec).toHaveBeenCalledWith(
        'pkill -f shh-agent',
        expect.any(Function)
      );
      expect(commandCount).toBe(2); // pkill and start agent
    });
  });

  describe('killProcess', () => {
    it('should kill process with given pid', async () => {
      mockSSH.exec.mockImplementation((cmd, cb) => {
        cb(null, {
          on: (event: string, handler: Function) => {
            if (event === 'close') handler(0);
          }
        } as any);
        return {} as any;
      });

      const result = await service.killProcess('test-host', 1234);

      expect(result.success).toBe(true);
      expect(result.state).toBe('active');
      expect(mockSSH.exec).toHaveBeenCalledWith(
        'sudo kill -9 1234',
        expect.any(Function)
      );
    });
  });

  describe('checkConnectivity', () => {
    it('should perform all health checks', async () => {
      // Setup successful health checks
      mockSSH.exec.mockImplementation((cmd, cb) => {
        cb(null, {
          on: (event: string, handler: Function) => {
            if (event === 'data') {
              if (cmd.includes('df')) {
                handler(Buffer.from('Filesystem Size Used Avail Use%\n/ 100G 50G 50G 50%'));
              } else if (cmd.includes('free')) {
                handler(Buffer.from('total used free\n8000 4000 4000'));
              }
            }
            if (event === 'close') handler(0);
          }
        } as any);
        return {} as any;
      });

      const result = await service.checkConnectivity('test-host');

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      expect(result.state).toBe('active');
      expect(mockSSH.exec).toHaveBeenCalledTimes(4); // df, free, ping, curl
    });

    it('should fail if disk usage is critical', async () => {
      mockSSH.exec.mockImplementation((cmd, cb) => {
        cb(null, {
          on: (event: string, handler: Function) => {
            if (event === 'data' && cmd.includes('df')) {
              handler(Buffer.from('Filesystem Size Used Avail Use%\n/ 100G 95G 5G 95%'));
            }
            if (event === 'close') handler(0);
          }
        } as any);
        return {} as any;
      });

      const result = await service.checkConnectivity('test-host');

      expect(result.success).toBe(false);
      expect(result.data).toBe(false);
      expect(result.state).toBe('unreachable');
    });
  });
});
