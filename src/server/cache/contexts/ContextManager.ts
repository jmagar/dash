/**
 * Manages all context-specific Redis services.
 * Acts as a facade to coordinate operations across different context types:
 * - FileSystem context: File system events, watchers, and usage
 * - Process context: Process metrics, resources, and services
 * - Network context: Network connections, interfaces, and metrics
 * - User context: User activity, preferences, and workflows
 * - App context: Application metrics, health, and features
 * - System context: System events, alerts, and dependencies
 */
export class ContextManager {
  private fileSystemContext: FileSystemContextService;
  private processContext: ProcessContextService;
  private networkContext: NetworkContextService;
  private userContext: UserContextService;
  private appContext: AppContextService;
  private systemContext: SystemContextService;

  constructor(config: RedisConfig) {
    this.fileSystemContext = new FileSystemContextService(config);
    this.processContext = new ProcessContextService(config);
    this.networkContext = new NetworkContextService(config);
    this.userContext = new UserContextService(config);
    this.appContext = new AppContextService(config);
    this.systemContext = new SystemContextService(config);
  }

  // FileSystem Context
  public setFileSystemContext(userId: string, projectId: string, context: FileSystemState): Promise<RedisResult<'OK'>> {
    return this.fileSystemContext.setFileSystemContext(userId, projectId, context);
  }

  public getFileSystemContext(userId: string, projectId: string): Promise<RedisResult<FileSystemState | null>> {
    return this.fileSystemContext.getFileSystemContext(userId, projectId);
  }

  // Process Context
  public setProcessContext(userId: string, projectId: string, context: ProcessState): Promise<RedisResult<'OK'>> {
    return this.processContext.setProcessContext(userId, projectId, context);
  }

  public getProcessContext(userId: string, projectId: string): Promise<RedisResult<ProcessState | null>> {
    return this.processContext.getProcessContext(userId, projectId);
  }

  // Network Context
  public setNetworkContext(userId: string, projectId: string, context: NetworkState): Promise<RedisResult<'OK'>> {
    return this.networkContext.setNetworkContext(userId, projectId, context);
  }

  public getNetworkContext(userId: string, projectId: string): Promise<RedisResult<NetworkState | null>> {
    return this.networkContext.getNetworkContext(userId, projectId);
  }

  // User Context
  public setUserContext(userId: string, projectId: string, context: UserState): Promise<RedisResult<'OK'>> {
    return this.userContext.setUserContext(userId, projectId, context);
  }

  public getUserContext(userId: string, projectId: string): Promise<RedisResult<UserState | null>> {
    return this.userContext.getUserContext(userId, projectId);
  }

  // App Context
  public setAppContext(userId: string, projectId: string, context: AppState): Promise<RedisResult<'OK'>> {
    return this.appContext.setAppContext(userId, projectId, context);
  }

  public getAppContext(userId: string, projectId: string): Promise<RedisResult<AppState | null>> {
    return this.appContext.getAppContext(userId, projectId);
  }

  // System Context
  public setSystemContext(userId: string, projectId: string, context: SystemState): Promise<RedisResult<'OK'>> {
    return this.systemContext.setSystemContext(userId, projectId, context);
  }

  public getSystemContext(userId: string, projectId: string): Promise<RedisResult<SystemState | null>> {
    return this.systemContext.getSystemContext(userId, projectId);
  }

  // Clear all contexts
  public async clearAllContexts(userId: string, projectId: string): Promise<void> {
    await Promise.all([
      this.fileSystemContext.clearFileSystemContext(userId, projectId),
      this.processContext.clearProcessContext(userId, projectId),
      this.networkContext.clearNetworkContext(userId, projectId),
      this.userContext.clearUserContext(userId, projectId),
      this.appContext.clearAppContext(userId, projectId),
      this.systemContext.clearSystemContext(userId, projectId)
    ]);
  }

  // Shutdown all services
  public async shutdown(): Promise<void> {
    await Promise.all([
      this.fileSystemContext.shutdown(),
      this.processContext.shutdown(),
      this.networkContext.shutdown(),
      this.userContext.shutdown(),
      this.appContext.shutdown(),
      this.systemContext.shutdown()
    ]);
  }
}
