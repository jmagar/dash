import { logger } from '../utils/logger';
import { sshService } from './ssh.service';
import type { Host } from '../../types/models-shared';
import { db } from '../db';
import { ApiError } from '../../types/error';
import path from 'path';
import fs from 'fs/promises';
import { config } from '../config';

interface AgentConfig {
  server_url: string;
  agent_id: string;
  labels?: Record<string, string>;
}

interface InstallOptions {
  installInContainer?: boolean;
  containerName?: string;
  useHostNetwork?: boolean;
  mountHostPaths?: boolean;
}

class AgentInstallerService {
  private readonly installScript = `
    #!/bin/bash
    set -e

    # Create log directories on host
    mkdir -p /mnt/user/appdata/shh/logs/{agent,server,ui}
    chmod -R 755 /mnt/user/appdata/shh/logs
    chown -R syslog:adm /mnt/user/appdata/shh/logs

    # Configure rsyslog for agent
    cat > /etc/rsyslog.d/10-shh-agent.conf << 'EOL'
# SHH Agent logging configuration
local0.*                        /mnt/user/appdata/shh/logs/agent/agent.log
local0.info                     /mnt/user/appdata/shh/logs/agent/info.log
local0.warn                     /mnt/user/appdata/shh/logs/agent/warn.log
local0.error                    /mnt/user/appdata/shh/logs/agent/error.log

# Enable TCP syslog reception
module(load="imtcp")
input(type="imtcp" port="1514")

# Set up template for structured logging
template(name="JSONFormat" type="list") {
    property(name="timereported")
    constant(value=" ")
    property(name="hostname")
    constant(value=" ")
    property(name="syslogtag")
    constant(value=" ")
    property(name="msg" format="json")
    constant(value="\n")
}

# Apply template to agent logs
local0.* action(type="omfile" file="/mnt/user/appdata/shh/logs/agent/agent.log" template="JSONFormat")
EOL

    # Configure log rotation
    cat > /etc/logrotate.d/shh-agent << 'EOL'
/mnt/user/appdata/shh/logs/agent/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 640 syslog adm
    sharedscripts
    postrotate
        /usr/lib/rsyslog/rsyslog-rotate
    endscript
}
EOL

    # Create symbolic links for compatibility
    ln -sf /mnt/user/appdata/shh/logs/agent /var/log/shh-agent

    # Restart rsyslog to apply changes
    systemctl restart rsyslog

    # Create agent directories
    mkdir -p /etc/shh-agent
    mkdir -p /var/lib/shh-agent

    # Copy binary and config
    cp ./shh-agent /usr/local/bin/shh-agent
    chmod +x /usr/local/bin/shh-agent
    cp ./config.json /etc/shh-agent/config.json

    # Create systemd service
    cat > /etc/systemd/system/shh-agent.service << 'EOL'
[Unit]
Description=SSH Helper Agent
After=network.target rsyslog.service

[Service]
Type=simple
ExecStart=/usr/local/bin/shh-agent
Restart=always
RestartSec=10
WorkingDirectory=/var/lib/shh-agent
User=root
Environment=SYSLOG_SERVER=localhost:1514
Environment=SYSLOG_PROTOCOL=tcp
Environment=SYSLOG_FACILITY=local0
Environment=LOG_DIR=/mnt/user/appdata/shh/logs

[Install]
WantedBy=multi-user.target
EOL

    # Reload systemd and start agent
    systemctl daemon-reload
    systemctl enable shh-agent
    systemctl start shh-agent

    echo "Agent installation complete"
  `;

  private readonly containerScript = `
    #!/bin/bash
    set -e

    # Create container
    docker run -d \\
      --name shh-agent \\
      --restart always \\
      --network \${NETWORK_MODE} \\
      -v /var/run/docker.sock:/var/run/docker.sock \\
      \${MOUNT_OPTS} \\
      -v \${PWD}/shh-agent:/usr/local/bin/shh-agent \\
      -v \${PWD}/config.json:/etc/shh-agent/config.json \\
      -v /var/log/shh-agent:/var/log/shh-agent \\
      -v /var/lib/shh-agent:/var/lib/shh-agent \\
      --privileged \\
      alpine:latest \\
      /usr/local/bin/shh-agent

    echo "Agent container started"
  `;

  /**
   * Install agent on a host
   */
  async installAgent(
    host: Host,
    agentConfig: AgentConfig,
    options: InstallOptions = {}
  ): Promise<void> {
    try {
      logger.info('Starting agent installation', {
        hostId: host.id,
        hostname: host.hostname,
        options,
      });

      // Create temporary directory
      const tempDir = `/tmp/shh-agent-${Date.now()}`;
      await sshService.executeCommand(host, `mkdir -p ${tempDir}`);

      // Create config file
      const configContent = JSON.stringify({
        agent: {
          id: agentConfig.agent_id,
          labels: {
            ...agentConfig.labels,
            container: options.installInContainer ? 'true' : 'false',
          },
        },
        server: {
          url: agentConfig.server_url,
        },
        docker: {
          enabled: true,
          socket_path: '/var/run/docker.sock',
        },
        monitoring: {
          collect_host_metrics: true,
          collect_container_metrics: true,
        },
        security: {
          scan_interval: 3600,  // 1 hour
          scan_on_startup: true,
        },
        backup: {
          enabled: true,
          interval: 86400,  // 24 hours
          retention_days: 7,
        },
      }, null, 2);

      // Write config file
      await sshService.executeCommand(host, `cat > ${tempDir}/config.json << 'EOL'\n${configContent}\nEOL`);

      // Copy agent binary
      const binaryPath = path.join(process.cwd(), config.agent.binaryPath);
      const binaryExists = await fs.access(binaryPath).then(() => true).catch(() => false);
      if (!binaryExists) {
        throw new ApiError('Agent binary not found', null, 500);
      }

      // Write install script
      if (options.installInContainer) {
        // Prepare container environment
        const networkMode = options.useHostNetwork ? 'host' : 'bridge';
        const mountOpts = options.mountHostPaths
          ? '-v /:/host:ro -v /proc:/host/proc:ro -v /sys:/host/sys:ro'
          : '';

        const containerScript = this.containerScript
          .replace('${NETWORK_MODE}', networkMode)
          .replace('${MOUNT_OPTS}', mountOpts);

        await sshService.executeCommand(host, `cat > ${tempDir}/install.sh << 'EOL'\n${containerScript}\nEOL`);
      } else {
        await sshService.executeCommand(host, `cat > ${tempDir}/install.sh << 'EOL'\n${this.installScript}\nEOL`);
      }

      await sshService.executeCommand(host, `chmod +x ${tempDir}/install.sh`);

      // Run installation
      const result = await sshService.executeCommand(host, `cd ${tempDir} && ./install.sh`);
      if (result.code !== 0) {
        throw new Error(`Installation failed: ${result.stderr}`);
      }

      // Cleanup
      await sshService.executeCommand(host, `rm -rf ${tempDir}`);

      // Update host in database
      await db.query(
        `UPDATE hosts SET
          agent_status = $1,
          agent_version = $2,
          metadata = jsonb_set(
            COALESCE(metadata, '{}'),
            '{agent_config}',
            $3::jsonb
          ),
          updated_at = NOW()
        WHERE id = $4`,
        ['installed', '1.0.0', JSON.stringify({
          ...agentConfig,
          install_options: options,
        }), host.id]
      );

      logger.info('Agent installation completed', {
        hostId: host.id,
        hostname: host.hostname,
        options,
      });
    } catch (error) {
      logger.error('Agent installation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        hostId: host.id,
        hostname: host.hostname,
        options,
      });

      // Update host status in database
      await db.query(
        `UPDATE hosts SET
          agent_status = $1,
          metadata = jsonb_set(
            COALESCE(metadata, '{}'),
            '{agent_error}',
            $2::jsonb
          ),
          updated_at = NOW()
        WHERE id = $3`,
        ['error', JSON.stringify(error instanceof Error ? error.message : 'Unknown error'), host.id]
      );

      throw error;
    }
  }

  /**
   * Uninstall agent from a host
   */
  async uninstallAgent(host: Host): Promise<void> {
    try {
      logger.info('Starting agent uninstallation', {
        hostId: host.id,
        hostname: host.hostname,
      });

      // Check if agent is running in container
      const metadata = await db.query<{ metadata: { agent_config: { install_options: InstallOptions } } }>(
        'SELECT metadata FROM hosts WHERE id = $1',
        [host.id]
      );

      const installOptions = metadata.rows[0]?.metadata?.agent_config?.install_options;

      if (installOptions?.installInContainer) {
        // Stop and remove container
        await sshService.executeCommand(host, 'docker stop shh-agent');
        await sshService.executeCommand(host, 'docker rm shh-agent');
      } else {
        // Stop and disable service
        await sshService.executeCommand(host, 'systemctl stop shh-agent');
        await sshService.executeCommand(host, 'systemctl disable shh-agent');

        // Remove files
        await sshService.executeCommand(host, 'rm -f /usr/local/bin/shh-agent');
        await sshService.executeCommand(host, 'rm -f /etc/systemd/system/shh-agent.service');
        await sshService.executeCommand(host, 'rm -rf /etc/shh-agent');
      }

      // Remove shared files
      await sshService.executeCommand(host, 'rm -rf /var/log/shh-agent');
      await sshService.executeCommand(host, 'rm -rf /var/lib/shh-agent');

      // Reload systemd if not in container
      if (!installOptions?.installInContainer) {
        await sshService.executeCommand(host, 'systemctl daemon-reload');
      }

      // Update host in database
      await db.query(
        `UPDATE hosts SET
          agent_status = $1,
          agent_version = NULL,
          metadata = metadata - 'agent_config' - 'agent_error',
          updated_at = NOW()
        WHERE id = $2`,
        ['uninstalled', host.id]
      );

      logger.info('Agent uninstallation completed', {
        hostId: host.id,
        hostname: host.hostname,
      });
    } catch (error) {
      logger.error('Agent uninstallation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        hostId: host.id,
        hostname: host.hostname,
      });

      throw error;
    }
  }
}

// Export singleton instance
export const agentInstallerService = new AgentInstallerService();
