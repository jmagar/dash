import { BaseService } from '../services/base.service';
import { ConfigManager } from './ConfigManager';
import { LoggingManager } from './LoggingManager';
import { MetricsManager } from './MetricsManager';
import { StateManager } from './StateManager';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

// Zod schemas for robust type validation
const TaskSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  type: z.string().min(1),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'cancelled', 'retrying']),
  priority: z.number().int().min(0).max(3),
  data: z.any(),
  result: z.any().optional(),
  error: z.string().optional(),
  createdAt: z.number().positive(),
  startedAt: z.number().positive().optional(),
  completedAt: z.number().positive().optional(),
  retries: z.number().int().min(0),
  maxRetries: z.number().int().min(0),
  nextRetryAt: z.number().positive().optional()
});

type Task = z.infer<typeof TaskSchema>;

enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  RETRYING = 'retrying'
}

enum TaskPriority {
  LOW = 0,
  MEDIUM = 1,
  HIGH = 2,
  CRITICAL = 3
}

type TaskHandler = (task: Task) => Promise<any>;

interface TaskManagerDependencies {
  configManager: ConfigManager;
  loggingManager: LoggingManager;
  metricsManager: MetricsManager;
  stateManager: StateManager;
}

export class TaskManager extends BaseService {
  private static instance: TaskManager;
  private tasks: Map<string, Task>;
  private handlers: Map<string, TaskHandler>;
  private queues: Map<TaskPriority, Task[]>;
  private eventEmitter: EventEmitter;
  private workerInterval?: NodeJS.Timer;
  private cleanupInterval?: NodeJS.Timer;
  private isProcessing: boolean;
  private dependencies: TaskManagerDependencies;

  private constructor(dependencies: TaskManagerDependencies) {
    super({
      name: 'task-manager',
      version: '1.0.0'
    });

    this.dependencies = dependencies;
    this.tasks = new Map();
    this.handlers = new Map();
    this.queues = new Map();
    this.eventEmitter = new EventEmitter();
    this.isProcessing = false;

    // Initialize queues for each priority level
    Object.values(TaskPriority)
      .filter(p => typeof p === 'number')
      .forEach(priority => {
        this.queues.set(priority as TaskPriority, []);
      });

    this.setupMetrics();
  }

  public static getInstance(dependencies?: TaskManagerDependencies): TaskManager {
    if (!TaskManager.instance) {
      if (!dependencies) {
        throw new Error('Dependencies must be provided when initializing TaskManager');
      }
      TaskManager.instance = new TaskManager(dependencies);
    }
    return TaskManager.instance;
  }

  public async init(): Promise<void> {
    try {
      // Validate configuration
      const config = this.dependencies.configManager.get('taskManager');
      const configSchema = z.object({
        workerInterval: z.number().positive(),
        cleanupInterval: z.number().positive(),
        maxRetries: z.number().int().min(0).max(10)
      });
      const validatedConfig = configSchema.parse(config);

      // Start task processing
      this.startTaskProcessing(validatedConfig.workerInterval);

      // Start cleanup interval
      this.startCleanupInterval(validatedConfig.cleanupInterval);

      this.logger.info('Task manager initialized successfully', { config: validatedConfig });
    } catch (error) {
      this.logger.error('Failed to initialize task manager', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined 
      });
      throw error;
    }
  }

  public async cleanup(): Promise<void> {
    try {
      // Stop intervals
      if (this.workerInterval) {
        clearInterval(this.workerInterval);
      }
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
      }

      // Gracefully stop processing
      while (this.isProcessing) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Clear all data structures
      this.tasks.clear();
      this.handlers.clear();
      this.queues.clear();

      // Remove all listeners
      this.eventEmitter.removeAllListeners();

      this.logger.info('Task manager cleaned up successfully');
    } catch (error) {
      this.logger.error('Error during task manager cleanup', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined 
      });
      throw error;
    }
  }

  public async getHealth(): Promise<{ status: 'healthy' | 'unhealthy' | 'degraded'; details?: Record<string, unknown>; }> {
    try {
      const queueSizes = Array.from(this.queues.entries()).reduce(
        (acc, [priority, queue]) => ({
          ...acc,
          [TaskPriority[priority]]: queue.length
        }),
        {}
      );

      const taskCounts = Array.from(this.tasks.values()).reduce(
        (acc, task) => ({
          ...acc,
          [task.status]: (acc[task.status] || 0) + 1
        }),
        {} as Record<string, number>
      );

      return {
        status: this.isHealthy(taskCounts) ? 'healthy' : 'degraded',
        details: {
          queueSizes,
          taskCounts,
          isProcessing: this.isProcessing,
          registeredHandlers: Array.from(this.handlers.keys())
        }
      };
    } catch (error) {
      this.logger.error('Task manager health check failed', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined 
      });
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  private isHealthy(taskCounts: Record<string, number>): boolean {
    const failedTaskThreshold = 10; // Configurable threshold
    const retryingTaskThreshold = 20; // Configurable threshold
    
    return (
      (taskCounts[TaskStatus.FAILED] || 0) < failedTaskThreshold &&
      (taskCounts[TaskStatus.RETRYING] || 0) < retryingTaskThreshold
    );
  }

  private setupMetrics(): void {
    // Enhanced task metrics with more detailed tracking
    this.metrics.createGauge('task_queue_size', 'Size of task queues', ['priority']);
    this.metrics.createGauge('tasks_by_status', 'Number of tasks by status', ['status']);
    this.metrics.createCounter('task_operations_total', 'Total number of task operations', ['operation', 'status', 'type']);
    this.metrics.createHistogram('task_duration_seconds', 'Task execution duration in seconds', ['type', 'status']);
    this.metrics.createCounter('task_retries_total', 'Total number of task retries', ['type']);
    this.metrics.createGauge('task_queue_age_seconds', 'Age of tasks in queue', ['priority']);
  }

  private startTaskProcessing(interval: number = 100): void {
    this.workerInterval = setInterval(async () => {
      if (this.isProcessing) return;

      try {
        this.isProcessing = true;
        await this.processNextTask();
      } catch (error) {
        this.logger.error('Unhandled error in task processing', { 
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined 
        });
      } finally {
        this.isProcessing = false;
      }
    }, interval);
  }

  private startCleanupInterval(interval: number = 3600000): void {
    this.cleanupInterval = setInterval(async () => {
      try {
        await this.cleanupOldTasks();
      } catch (error) {
        this.logger.error('Error cleaning up tasks', { 
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined 
        });
      }
    }, interval);
  }

  private async processNextTask(): Promise<void> {
    // Process tasks in priority order
    for (let priority = TaskPriority.CRITICAL; priority >= TaskPriority.LOW; priority--) {
      const queue = this.queues.get(priority);
      if (!queue || queue.length === 0) continue;

      const task = queue.shift();
      if (!task) continue;

      try {
        // Validate task before processing
        TaskSchema.parse(task);

        // Track queue age metric
        const queueAge = Date.now() - task.createdAt;
        this.metrics.setGauge('task_queue_age_seconds', queueAge / 1000, {
          priority: TaskPriority[priority]
        });

        await this.executeTask(task);
      } catch (error) {
        this.logger.error('Error processing task', { 
          taskId: task.id, 
          taskType: task.type,
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined 
        });

        // Re-queue the task if validation fails or processing error occurs
        if (queue) {
          queue.push(task);
        }
      }
      break;
    }

    // Update queue size metrics
    this.updateQueueMetrics();
  }

  private async executeTask(task: Task): Promise<void> {
    const handler = this.handlers.get(task.type);
    if (!handler) {
      this.failTask(task, new Error(`No handler registered for task type: ${task.type}`));
      return;
    }

    task.status = TaskStatus.RUNNING;
    task.startedAt = Date.now();
    this.updateTaskMetrics();

    try {
      const result = await handler(task);
      this.completeTask(task, result);
    } catch (error) {
      if (task.retries < task.maxRetries) {
        this.retryTask(task, error as Error);
      } else {
        this.failTask(task, error as Error);
      }
    }
  }

  private completeTask(task: Task, result: any): void {
    task.status = TaskStatus.COMPLETED;
    task.result = result;
    task.completedAt = Date.now();

    this.metrics.incrementCounter('task_operations_total', {
      operation: 'complete',
      status: 'success',
      type: task.type
    });

    if (task.startedAt) {
      const duration = (Date.now() - task.startedAt) / 1000;
      this.metrics.observeHistogram('task_duration_seconds', duration, {
        type: task.type,
        status: task.status
      });
    }

    this.eventEmitter.emit('taskCompleted', task);
  }

  private failTask(task: Task, error: Error): void {
    task.status = TaskStatus.FAILED;
    task.error = error.message;
    task.completedAt = Date.now();

    this.metrics.incrementCounter('task_operations_total', {
      operation: 'complete',
      status: 'failure',
      type: task.type
    });

    if (task.startedAt) {
      const duration = (Date.now() - task.startedAt) / 1000;
      this.metrics.observeHistogram('task_duration_seconds', duration, {
        type: task.type,
        status: task.status
      });
    }

    this.eventEmitter.emit('taskFailed', task);
  }

  private retryTask(task: Task, error: Error): void {
    task.status = TaskStatus.RETRYING;
    task.error = error.message;
    task.retries++;
    task.nextRetryAt = Date.now() + Math.pow(2, task.retries) * 1000; // Exponential backoff

    this.metrics.incrementCounter('task_retries_total', { type: task.type });

    // Re-queue the task
    const queue = this.queues.get(task.priority);
    if (queue) {
      queue.push(task);
    }

    this.eventEmitter.emit('taskRetrying', task);
  }

  private async cleanupOldTasks(): Promise<void> {
    const now = Date.now();
    const TWO_WEEKS = 14 * 24 * 60 * 60 * 1000;
    let cleanedTasksCount = 0;

    for (const [id, task] of this.tasks.entries()) {
      if (
        task.status === TaskStatus.COMPLETED ||
        task.status === TaskStatus.FAILED ||
        task.status === TaskStatus.CANCELLED
      ) {
        if (task.completedAt && now - task.completedAt > TWO_WEEKS) {
          this.tasks.delete(id);
          cleanedTasksCount++;
        }
      }
    }

    if (cleanedTasksCount > 0) {
      this.logger.info('Cleaned up old tasks', { count: cleanedTasksCount });
    }
  }

  private updateQueueMetrics(): void {
    for (const [priority, queue] of this.queues.entries()) {
      this.metrics.setGauge('task_queue_size', queue.length, {
        priority: TaskPriority[priority]
      });
    }
  }

  private updateTaskMetrics(): void {
    const counts = new Map<TaskStatus, number>();
    for (const task of this.tasks.values()) {
      counts.set(task.status, (counts.get(task.status) || 0) + 1);
    }

    for (const [status, count] of counts.entries()) {
      this.metrics.setGauge('tasks_by_status', count, { status });
    }
  }

  public registerHandler(type: string, handler: TaskHandler): void {
    if (this.handlers.has(type)) {
      this.logger.warn('Overwriting existing task handler', { type });
    }
    this.handlers.set(type, handler);
  }

  public async createTask(
    type: string,
    data: any,
    priority: TaskPriority = TaskPriority.MEDIUM,
    maxRetries: number = 3
  ): Promise<Task> {
    if (!this.handlers.has(type)) {
      throw new Error(`No handler registered for task type: ${type}`);
    }

    const task: Task = {
      id: uuidv4(),
      name: `${type}-${Date.now()}`,
      type,
      status: TaskStatus.PENDING,
      priority,
      data,
      createdAt: Date.now(),
      retries: 0,
      maxRetries
    };

    // Validate task before adding
    try {
      TaskSchema.parse(task);
    } catch (error) {
      this.logger.error('Invalid task creation', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        task 
      });
      throw error;
    }

    this.tasks.set(task.id, task);
    const queue = this.queues.get(priority);
    if (queue) {
      queue.push(task);
    }

    this.metrics.incrementCounter('task_operations_total', {
      operation: 'create',
      status: 'success',
      type: task.type
    });

    this.eventEmitter.emit('taskCreated', task);
    return task;
  }

  public async cancelTask(id: string): Promise<void> {
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error(`Task not found: ${id}`);
    }

    if (task.status === TaskStatus.RUNNING) {
      throw new Error(`Cannot cancel running task: ${id}`);
    }

    task.status = TaskStatus.CANCELLED;
    task.completedAt = Date.now();

    // Remove from queue if present
    const queue = this.queues.get(task.priority);
    if (queue) {
      const index = queue.findIndex(t => t.id === id);
      if (index !== -1) {
        queue.splice(index, 1);
      }
    }

    this.metrics.incrementCounter('task_operations_total', {
      operation: 'cancel',
      status: 'success',
      type: task.type
    });

    this.eventEmitter.emit('taskCancelled', task);
  }

  public getTask(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  public getTasks(status?: TaskStatus): Task[] {
    if (status) {
      return Array.from(this.tasks.values()).filter(t => t.status === status);
    }
    return Array.from(this.tasks.values());
  }

  public on(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.on(event, listener);
  }

  public off(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.off(event, listener);
  }
}
