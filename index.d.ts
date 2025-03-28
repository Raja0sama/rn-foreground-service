declare module '@supersami/rn-foreground-service' {
  /**
   * Error types for error handling
   */
  export enum ERROR_TYPES {
    INVALID_CONFIG = 'INVALID_CONFIG',
    SERVICE_ERROR = 'SERVICE_ERROR',
    PERMISSION_DENIED = 'PERMISSION_DENIED',
    TASK_ERROR = 'TASK_ERROR',
    UNSUPPORTED_PLATFORM = 'UNSUPPORTED_PLATFORM',
    INITIALIZATION_ERROR = 'INITIALIZATION_ERROR',
    RECOVERY_ERROR = 'RECOVERY_ERROR'
  }

  /**
   * Service types for Android 14+
   */
  export type ServiceType = 
    | 'camera'
    | 'connectedDevice'
    | 'dataSync'
    | 'health'
    | 'location'
    | 'mediaPlayback'
    | 'mediaProjection'
    | 'microphone'
    | 'phoneCall'
    | 'remoteMessaging'
    | 'shortService'
    | 'specialUse'
    | 'systemExempted';

  /**
   * Task priority levels
   */
  export type TaskPriority = 'high' | 'normal' | 'low';

  /**
   * Notification configuration for the foreground service
   */
  export interface NotificationConfig {
    id: number;
    title?: string;
    message?: string;
    ServiceType?: ServiceType;
    vibration?: boolean;
    visibility?: 'private' | 'public' | 'secret';
    icon?: string;
    largeIcon?: string;
    importance?: 'none' | 'min' | 'low' | 'default' | 'high' | 'max';
    number?: string;
    button?: boolean;
    buttonText?: string;
    buttonOnPress?: string;
    button2?: boolean;
    button2Text?: string;
    button2OnPress?: string;
    mainOnPress?: string;
    progress?: {
      max: number;
      curr: number;
    };
    color?: string;
    mainIntentMutable?: boolean;
    buttonMutable?: boolean;
    button2Mutable?: boolean;
  }

  /**
   * Task configuration for background execution
   */
  export interface TaskConfig {
    taskId?: string;
    delay?: number;
    onLoop?: boolean;
    loopDelay?: number;
    onSuccess?: (result?: any) => void;
    onError?: (error?: any) => void;
    timeout?: number;
    priority?: TaskPriority;
    isPaused?: boolean;
    resetTimer?: boolean;
  }

  /**
   * Task information returned from getTask and getAllTasks
   */
  export interface TaskInfo {
    nextExecutionTime: number;
    delay: number;
    loopDelay?: number;
    onLoop: boolean;
    timeout: number;
    priority: TaskPriority;
    isPaused: boolean;
    createdAt: number;
    lastExecutedAt: number | null;
    executionCount: number;
    failureCount: number;
    hasTaskFn: boolean;
  }

  /**
   * Event data interface
   */
  export interface EventData {
    type: string;
    [key: string]: any;
  }

  /**
   * Event listener function
   */
  export type EventListener = (event: EventData) => void;

  /**
   * Task function type
   */
  export type TaskFunction = () => any | Promise<any>;

  /**
   * Configuration for foreground service manager
   */
  export interface ForegroundServiceManagerConfig {
    enableServiceRecovery?: boolean;
    autoRestartOnBoot?: boolean;
    restartOnForeground?: boolean;
    showErrorAlerts?: boolean;
    onServiceError?: (error: any) => void;
    taskSamplingInterval?: number;
    enableDebugLogging?: boolean;
  }

  /**
   * Task scheduler configuration
   */
  export interface TaskSchedulerConfig {
    minInterval?: number;
    maxInterval?: number;
    intervalStep?: number;
    maxConcurrentTasks?: number;
    adaptiveScheduling?: boolean;
  }

  /**
   * Service recovery configuration
   */
  export interface ServiceRecoveryConfig {
    maxRecoveryAttempts?: number;
    initialRecoveryDelay?: number;
    maxRecoveryDelay?: number;
    useExponentialBackoff?: boolean;
    backoffFactor?: number;
    recoveryThrottleTime?: number;
    recoverOnForeground?: boolean;
    enableHealthCheck?: boolean;
    healthCheckInterval?: number;
  }

  /**
   * Foreground Service Manager interface
   */
  export interface IForegroundServiceManager {
    initialize(config?: ForegroundServiceManagerConfig): Promise<boolean>;
    startService(config: NotificationConfig): Promise<boolean>;
    updateNotification(config: NotificationConfig): Promise<boolean>;
    stopService(): Promise<boolean>;
    stopAllServices(): Promise<boolean>;
    addTask(task: TaskFunction, options?: TaskConfig): string;
    updateTask(taskId: string, task: TaskFunction, options?: TaskConfig): boolean;
    removeTask(taskId: string): boolean;
    pauseTask(taskId: string): boolean;
    resumeTask(taskId: string): boolean;
    removeAllTasks(): void;
    isServiceRunning(): boolean;
    getTaskInfo(taskId: string): TaskInfo | null;
    getAllTasks(): Record<string, TaskInfo>;
    setAutoRestart(enabled: boolean): Promise<boolean>;
    addEventListener(eventType: string, callback: EventListener): () => void;
    removeEventListener(eventType: string, callback: EventListener): void;
    cleanup(): Promise<void>;
  }

  /**
   * Task Manager interface
   */
  export interface ITaskManager {
    initialize(): Promise<void>;
    addTask(taskFn: TaskFunction, options?: TaskConfig): string;
    updateTask(taskId: string, taskFn: TaskFunction, options?: TaskConfig): boolean;
    removeTask(taskId: string): boolean;
    removeAllTasks(): void;
    pauseTask(taskId: string): boolean;
    resumeTask(taskId: string): boolean;
    executeDueTasks(): Promise<void>;
    executeTaskWithTimeout(taskId: string): Promise<any>;
    setServiceRunning(isRunning: boolean, serviceConfig?: NotificationConfig | null): void;
    isServiceRunning(): boolean;
    getServiceConfig(): NotificationConfig | null;
    getTask(taskId: string): TaskInfo | null;
    getAllTasks(): Record<string, TaskInfo>;
    addEventListener(eventType: string, callback: EventListener): () => void;
    removeEventListener(eventType: string, callback: EventListener): void;
    removeAllEventListeners(): void;
  }

  /**
   * Task Scheduler interface
   */
  export interface ITaskScheduler {
    start(): void;
    stop(): void;
    executeTasks(): Promise<void>;
    updateConfig(newConfig: TaskSchedulerConfig): void;
    forceExecution(): void;
    getStatus(): {
      isRunning: boolean;
      currentInterval: number;
      pendingTasks: number;
      idleTime: number;
      appState: string;
      config: TaskSchedulerConfig;
    };
  }

  /**
   * Service Recovery Manager interface
   */
  export interface IServiceRecoveryManager {
    initialize(config?: ServiceRecoveryConfig): void;
    checkAndRecoverService(): Promise<void>;
    recoverService(serviceConfig: NotificationConfig): Promise<void>;
    isServiceRunningNatively(): Promise<boolean>;
    resetRecoveryCounters(): void;
    updateConfig(newConfig: ServiceRecoveryConfig): void;
    cleanup(): void;
    addEventListener(eventType: string, callback: EventListener): () => void;
    removeEventListener(eventType: string, callback: EventListener): void;
    getStatus(): {
      isMonitoring: boolean;
      recoveryAttempts: number;
      lastRecoveryTime: number;
      currentBackoffDelay: number;
      lastServiceState: { isRunning: boolean; timestamp: number } | null;
      config: ServiceRecoveryConfig;
    };
  }

  /**
   * Legacy ReactNativeForegroundService interface (for backward compatibility)
   */
  export interface ReactNativeForegroundService {
    register(options: { config: { alert?: boolean; onServiceErrorCallBack?: (error?: any) => void } }): void;
    start(config: NotificationConfig): Promise<boolean>;
    update(config: NotificationConfig): Promise<boolean>;
    stop(): Promise<boolean>;
    stopAll(): Promise<boolean>;
    is_running(): boolean;
    add_task(task: TaskFunction, options?: TaskConfig): string;
    update_task(task: TaskFunction, options?: TaskConfig & { taskId: string }): string;
    remove_task(taskId: string): boolean;
    is_task_running(taskId: string): boolean;
    remove_all_tasks(): Record<string, never>;
    get_task(taskId: string): TaskInfo | null;
    get_all_tasks(): Record<string, TaskInfo>;
    eventListener(callback: (event: any) => void): () => void;
    cleanup(): Promise<void>;
    setAutoRestart(enabled: boolean): Promise<boolean>;
    pauseTask(taskId: string): boolean;
    resumeTask(taskId: string): boolean;
  }

  // Export modern API interfaces
  export const ForegroundServiceManager: IForegroundServiceManager;
  export const TaskManager: ITaskManager;
  export const ServiceRecoveryManager: IServiceRecoveryManager;

  // Export utility function for backwards compatibility
  export function setupServiceErrorListener(config: {
    onServiceFailToStart?: (error?: any) => void;
    alert?: boolean;
  }): () => void;

  // Export default (legacy API)
  const ReactNativeForegroundService: ReactNativeForegroundService;
  export default ReactNativeForegroundService;
}