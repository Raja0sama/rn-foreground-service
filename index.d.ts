/**
 * Error types for better error handling
 */
export const enum ERROR_TYPES {
  INVALID_CONFIG = 'INVALID_CONFIG',
  SERVICE_ERROR = 'SERVICE_ERROR',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  TASK_ERROR = 'TASK_ERROR',
  UNSUPPORTED_PLATFORM = 'UNSUPPORTED_PLATFORM'
}

/**
 * Notification configuration for the foreground service
 */
interface NotificationConfig {
  id: number;
  title?: string;
  message?: string;
  ServiceType?: 'camera' | 'connectedDevice' | 'dataSync' | 'health' | 'location' | 'mediaPlayback' | 
                'mediaProjection' | 'microphone' | 'phoneCall' | 'remoteMessaging' | 'shortService' | 
                'specialUse' | 'systemExempted';
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
interface TaskConfig {
  delay?: number;
  onLoop?: boolean;
  taskId?: string;
  onSuccess?: (result?: any) => void;
  onError?: (error?: any) => void;
  loopDelay?: number;
}

/**
 * Registration configuration
 */
interface RegisterConfig {
  config: {
    alert?: boolean;
    onServiceErrorCallBack?: (error?: any) => void;
    samplingInterval?: number;
  };
}

/**
 * Event data for notification clicks
 */
interface NotificationEventData {
  main?: string;
  button?: string;
  button2?: string;
}

/**
 * Event data for task errors
 */
interface TaskErrorEventData {
  taskId: string;
  error: string;
}

/**
 * Event data for service errors
 */
interface ServiceErrorEventData {
  error: string;
}

/**
 * Type for task functions
 */
type TaskFunction = () => any | Promise<any>;

/**
 * Type for event listeners
 */
type EventListener = (eventData: any) => void;

declare const ReactNativeForegroundService: {
  /**
   * Register the foreground service task handler
   * Must be called before any other methods, typically at app initialization
   */
  register: (config: RegisterConfig) => void;

  /**
   * Start the foreground service with the given notification config
   * Required for Android 14+: must specify a valid ServiceType
   * @throws {Error} If configuration is invalid or service fails to start
   */
  start: (config: NotificationConfig) => Promise<boolean>;

  /**
   * Update an existing notification for the service
   * @throws {Error} If configuration is invalid or update fails
   */
  update: (config: NotificationConfig) => Promise<boolean>;

  /**
   * Stop the current foreground service instance
   * If multiple instances are running, only decrements the counter
   */
  stop: () => Promise<void>;

  /**
   * Stop all foreground service instances immediately
   */
  stopAll: () => Promise<void>;

  /**
   * Check if the foreground service is currently running
   */
  is_running: () => boolean;

  /**
   * Add a task to be executed in the background
   * @param task Function to execute
   * @param config Task configuration
   * @returns Task ID for later reference
   * @throws {Error} If task is not a function
   */
  add_task: (
    task: TaskFunction,
    config?: TaskConfig
  ) => string;

  /**
   * Update an existing task
   * @param task New function to execute
   * @param config Updated task configuration (must include taskId)
   * @returns Task ID
   * @throws {Error} If task is not a function or taskId is missing
   */
  update_task: (
    task: TaskFunction,
    config: TaskConfig & { taskId: string }
  ) => string;

  /**
   * Remove a task by ID
   * @returns true if task was found and removed, false otherwise
   */
  remove_task: (taskId: string) => boolean;

  /**
   * Check if a task is currently scheduled
   */
  is_task_running: (taskId: string) => boolean;

  /**
   * Remove all scheduled tasks
   */
  remove_all_tasks: () => boolean;

  /**
   * Get the configuration of a specific task
   * @returns Task config or undefined if not found
   */
  get_task: (taskId: string) => any;

  /**
   * Get all scheduled tasks
   * @returns Dictionary of all tasks
   */
  get_all_tasks: () => Record<string, any>;

  /**
   * Add a listener for notification click events
   * @param callback Function to call when notification is clicked
   * @returns Cleanup function to remove the listener
   */
  eventListener: (callback: EventListener) => () => void;

  /**
   * Clean up all resources used by the foreground service
   * Should be called before app unmounts
   */
  cleanup: () => Promise<void>;

  /**
   * Request notification permission explicitly (for Android 13+)
   * Note: This requires integration with a permissions library
   * @throws {Error} Instructing the developer to use a permissions library
   */
  requestNotificationPermission: () => Promise<boolean>;

  /**
   * Error type constants for error handling
   */
  ERROR_TYPES: typeof ERROR_TYPES;
};

export function setupServiceErrorListener(config: {
  onServiceFailToStart?: (error?: any) => void;
  alert?: boolean;
}): () => void;

export default ReactNativeForegroundService;