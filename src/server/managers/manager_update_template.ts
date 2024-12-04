import { ConfigManager } from './ConfigManager';
import { MetricsManager } from './MetricsManager';
import { LoggingManager } from './LoggingManager';
import { BaseManagerDependencies } from './ManagerContainer';

export class TemplateManager {
  private static instance: TemplateManager;

  // Dependency references
  private configManager?: ConfigManager;
  private metricsManager?: MetricsManager;
  private loggingManager?: LoggingManager;

  private constructor() {}

  public static getInstance(): TemplateManager {
    if (!TemplateManager.instance) {
      TemplateManager.instance = new TemplateManager();
    }
    return TemplateManager.instance;
  }

  // New initialization method for dependency injection
  public initialize(deps: BaseManagerDependencies): void {
    this.configManager = deps.configManager;
    this.metricsManager = deps.metricsManager;
    this.loggingManager = deps.loggingManager;
  }

  // Existing methods updated to use injected dependencies
  public async init(): Promise<void> {
    try {
      // Use injected dependencies
      this.loggingManager?.info('Template Manager initializing');
      
      // Add any initialization logic that was previously using local dependencies
      const config = this.configManager?.getConfig('template');
      
      // Example metric tracking
      this.metricsManager?.incrementCounter('template_init');
    } catch (error) {
      this.loggingManager?.error('Failed to initialize Template Manager', { error });
    }
  }
}
