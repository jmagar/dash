import { LoggingManager } from '../../managers/LoggingManager';
import type { Settings, SettingsPath, SettingsValue, SettingsError } from '../../../types/settings';
import { BaseService } from '../base.service';

export abstract class BaseSettingsService extends BaseService {
  protected constructor() {
    super({
      name: 'SettingsService',
      logger: LoggingManager.getInstance(),
    });
  }

  protected getDefaultSettings(): Settings {
    return {
      admin: {
        system: {
          serverSettings: {
            logLevel: 'info',
            maxConcurrentOperations: 10,
            tempFileLifetime: 24
          },
          databaseSettings: {
            connectionPoolSize: 10,
            statementTimeout: 30,
            idleTimeout: 300
          },
          securitySettings: {
            sessionTimeout: 60,
            maxLoginAttempts: 3,
            passwordPolicy: {
              minLength: 8,
              requireNumbers: true,
              requireSpecialChars: true,
              requireUppercase: true,
              requireLowercase: true
            }
          }
        },
        userManagement: {
          defaultRole: 'user',
          roles: [],
          passwordExpiryDays: 90,
          inactivityLockoutDays: 30
        },
        hostManagement: {
          sshDefaults: {
            port: 22,
            timeout: 30,
            keepaliveInterval: 60,
            compression: true
          },
          agentDefaults: {
            updateInterval: 300,
            healthCheckInterval: 60,
            logRetentionDays: 30
          },
          securityPolicies: {
            allowPasswordAuth: false,
            requirePublicKey: true,
            allowedKeyTypes: ['ed25519', 'rsa']
          }
        },
        storageManagement: {
          backupSettings: {
            enabled: true,
            interval: 24,
            retention: 30,
            location: './backups'
          },
          cacheSettings: {
            maxSize: 1024,
            ttl: 60,
            cleanupInterval: 15
          },
          quotas: {
            defaultUserQuota: 5120,
            maxFileSize: 100,
            warningThreshold: 80
          }
        }
      },
      user: {
        interface: {
          theme: 'system',
          accentColor: '#007AFF',
          language: 'en',
          layout: {
            density: 'standard',
            sidebarWidth: 250,
            sidebarCollapsed: false,
            terminalHeight: 300
          },
          fonts: {
            size: 14,
            useCustomMonoFont: false
          }
        },
        fileExplorer: {
          viewMode: 'list',
          sortBy: {
            field: 'name',
            direction: 'asc'
          },
          showHiddenFiles: false,
          previewPane: {
            enabled: true,
            position: 'right',
            width: 300
          },
          fileAssociations: [],
          gridSettings: {
            itemSize: 'medium',
            showLabels: true
          }
        },
        operations: {
          compression: {
            defaultFormat: 'zip',
            preserveStructure: true,
            defaultLocation: './archives'
          },
          confirmations: {
            delete: true,
            move: true,
            overwrite: true,
            compress: true
          },
          search: {
            saveHistory: true,
            maxHistoryItems: 100,
            caseSensitive: false,
            useRegex: false
          },
          defaultLocations: {
            downloads: './downloads',
            uploads: './uploads',
            extracts: './extracts'
          }
        },
        personal: {
          shortcuts: {},
          notifications: {
            enabled: true,
            sound: true,
            operationComplete: true,
            errors: true
          },
          favorites: {
            locations: [],
            hosts: []
          },
          tags: [],
          recentLimit: 10
        }
      }
    };
  }

  protected validateSettings(
    _path: SettingsPath,
    _value: SettingsValue
  ): SettingsError | null {
    // Implement validation logic here
    // For now, return null (no validation errors)
    return null;
  }
}
