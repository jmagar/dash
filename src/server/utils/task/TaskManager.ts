import { EventEmitter } from 'events';
import { MetricsManager } from '../metrics/MetricsManager';
import { LoggingManager } from '../../logging/LoggingManager';
import { ConfigManager } from '../config/ConfigManager';

interface Task {
  id: string;
  name: string;
  interval: number;
  lastRun?: Date;
  nextRun?: Date;
  status: 'idle' | 'running' | 'failed';
  handler: () => Promise<void>;
  errorCount: number;
}

interface TaskOptions {
  maxRetries?: number;
  backoffFactor?: number;
  timeout?: number;
}

export class TaskManager extends EventEmitter {
  private static instance: TaskManager;
  private tasks: Map<string, Task>;
  private intervals: Map<string, NodeJS.Timer>;
  private metricsManager: MetricsManager;
  private logger: LoggingManager;
  private configManager: ConfigManager;

  private constructor() {
    super();
    this.tasks = new Map();
    this.intervals = new Map();
    this.metricsManager = MetricsManager.getInstance();
    this.logger = LoggingManager.getInstance();
    this.configManager = ConfigManager.getInstance();

    // Initialize task metrics
    this.metricsManager.createCounter('task_executions_total', 'Total task executions');
    this.metricsManager.createCounter('task_failures_total', 'Total task failures');
    this.metricsManager.createGauge('tasks_running', 'Number of currently running tasks');
    this.metricsManager.createHistogram('task_duration_seconds', 'Task execution duration');
  }

  public static getInstance(): TaskManager {
    if (!TaskManager.instance) {
      TaskManager.instance = new TaskManager();
    }
    return TaskManager.instance;
  }

  public registerTask(
    name: string,
    interval: number,
    handler: () => Promise<void>,
    options: TaskOptions = {}
  ): string {
    const id = crypto.randomUUID();
    
    this.tasks.set(id, {
      id,
      name,
      interval,
      handler,
      status: 'idle',
      errorCount: 0
    });

    this.logger.info('Task registered', { taskId: id, taskName: name, interval });
    
    // Start the task
    this.scheduleTask(id, options);
    
    return id;
  }

  private async executeTask(id: string, options: TaskOptions): Promise<void> {
    const task = this.tasks.get(id);
    if (!task) return;

    const startTime = process.hrtime();
    task.status = 'running';
    task.lastRun = new Date();
    
    this.metricsManager.incrementCounter('task_executions_total', { task: task.name });
    this.metricsManager.incrementGauge('tasks_running', 1);

    try {
      // Execute with timeout
      const timeoutMs = options.timeout || this.configManager.get<number>('tasks.defaultTimeout');
      await Promise.race([
        task.handler(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Task timeout')), timeoutMs)
        )
      ]);

      // Reset error count on success
      task.errorCount = 0;
      task.status = 'idle';

    } catch (error) {
      task.status = 'failed';
      task.errorCount++;

      this.metricsManager.incrementCounter('task_failures_total', { task: task.name });
      
      this.logger.error('Task execution failed', { 
        taskId: id,
        taskName: task.name,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // Handle retries
      const maxRetries = options.maxRetries || this.configManager.get<number>('tasks.maxRetries');
      if (task.errorCount < maxRetries) {
        const backoffFactor = options.backoffFactor || this.configManager.get<number>('tasks.backoffFactor');
        const backoffDelay = task.interval * Math.pow(backoffFactor, task.errorCount);
        
        this.logger.info('Retrying task', {
          taskId: id,
          taskName: task.name,
          attempt: task.errorCount,
          nextRetry: backoffDelay
        });

        setTimeout(() => this.executeTask(id, options), backoffDelay);
      }
    } finally {
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const duration = seconds + nanoseconds / 1e9;
      
      this.metricsManager.observeHistogram('task_duration_seconds', duration, {
        task: task.name
      });
      
      this.metricsManager.decrementGauge('tasks_running', 1);
      
      // Update next run time
      task.nextRun = new Date(Date.now() + task.interval);
    }
  }

  private scheduleTask(id: string, options: TaskOptions): void {
    const task = this.tasks.get(id);
    if (!task) return;

    // Clear existing interval if any
    this.clearTaskSchedule(id);

    // Schedule new interval
    const interval = setInterval(() => {
      void this.executeTask(id, options);
    }, task.interval);

    this.intervals.set(id, interval);
  }

  public async runTaskNow(id: string): Promise<void> {
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error(`Task ${id} not found`);
    }

    await this.executeTask(id, {});
  }

  public pauseTask(id: string): void {
    this.clearTaskSchedule(id);
    const task = this.tasks.get(id);
    if (task) {
      this.logger.info('Task paused', { taskId: id, taskName: task.name });
    }
  }

  public resumeTask(id: string, options: TaskOptions = {}): void {
    const task = this.tasks.get(id);
    if (task) {
      this.scheduleTask(id, options);
      this.logger.info('Task resumed', { taskId: id, taskName: task.name });
    }
  }

  public removeTask(id: string): void {
    this.clearTaskSchedule(id);
    const task = this.tasks.get(id);
    if (task) {
      this.tasks.delete(id);
      this.logger.info('Task removed', { taskId: id, taskName: task.name });
    }
  }

  private clearTaskSchedule(id: string): void {
    const interval = this.intervals.get(id);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(id);
    }
  }

  public getTaskStatus(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  public getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  public shutdown(): void {
    // Clear all intervals
    for (const [id] of this.intervals) {
      this.clearTaskSchedule(id);
    }
    
    this.logger.info('Task manager shutting down');
    
    // Clear tasks
    this.tasks.clear();
  }
}

export default TaskManager.getInstance();
