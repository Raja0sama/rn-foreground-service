import { Platform, AppRegistry } from 'react-native';
import foregroundServiceManager from './ForegroundServiceManager';
import taskManager from './TaskManager';
import serviceRecoveryManager from './ServiceRecoveryManager';

// Legacy API compatibility layer
const ReactNativeForegroundService = {
  /**
   * Register the foreground service
   * @param {Object} options Registration options
   */
  register: async ({ config = {} }) => {
    if (Platform.OS !== 'android') {
      console.warn('ReactNativeForegroundService is only supported on Android');
      return;
    }
    
    await foregroundServiceManager.initialize({
      showErrorAlerts: config.alert !== false,
      onServiceError: config.onServiceErrorCallBack,
      enableDebugLogging: true
    });
  },
  
  /**
   * Start the foreground service
   * @param {Object} config Service configuration
   * @returns {Promise<boolean>} Whether the service was started successfully
   */
  start: async (config) => {
    if (Platform.OS !== 'android') {
      return false;
    }
    
    return await foregroundServiceManager.startService(config);
  },
  
  /**
   * Update the foreground service notification
   * @param {Object} config Updated configuration
   * @returns {Promise<boolean>} Whether the notification was updated successfully
   */
  update: async (config) => {
    if (Platform.OS !== 'android') {
      return false;
    }
    
    return await foregroundServiceManager.updateNotification(config);
  },
  
  /**
   * Stop the foreground service
   * @returns {Promise<boolean>} Whether the service was stopped successfully
   */
  stop: async () => {
    if (Platform.OS !== 'android') {
      return false;
    }
    
    return await foregroundServiceManager.stopService();
  },
  
  /**
   * Stop all instances of the foreground service
   * @returns {Promise<boolean>} Whether all services were stopped successfully
   */
  stopAll: async () => {
    if (Platform.OS !== 'android') {
      return false;
    }
    
    return await foregroundServiceManager.stopAllServices();
  },
  
  /**
   * Check if the service is running
   * @returns {boolean} Whether the service is running
   */
  is_running: () => {
    if (Platform.OS !== 'android') {
      return false;
    }
    
    return foregroundServiceManager.isServiceRunning();
  },
  
  /**
   * Add a task to be executed by the service
   * @param {Function} task Task function to execute
   * @param {Object} options Task options
   * @returns {string} Task ID
   */
  add_task: (task, options = {}) => {
    if (Platform.OS !== 'android') {
      return 'dummy_task_id';
    }
    
    return foregroundServiceManager.addTask(task, {
      delay: options.delay || 0,
      onLoop: options.onLoop || false,
      taskId: options.taskId,
      onSuccess: options.onSuccess,
      onError: options.onError
    });
  },
  
  /**
   * Update an existing task
   * @param {Function} task Task function to execute
   * @param {Object} options Task options
   * @returns {string} Task ID
   */
  update_task: (task, options = {}) => {
    if (Platform.OS !== 'android') {
      return options.taskId || 'dummy_task_id';
    }
    
    if (!options.taskId) {
      throw new Error('taskId is required to update a task');
    }
    
    foregroundServiceManager.updateTask(options.taskId, task, {
      delay: options.delay,
      onLoop: options.onLoop,
      onSuccess: options.onSuccess,
      onError: options.onError,
      resetTimer: true
    });
    
    return options.taskId;
  },
  
  /**
   * Remove a task
   * @param {string} taskId ID of the task to remove
   * @returns {boolean} Whether the task was removed successfully
   */
  remove_task: (taskId) => {
    if (Platform.OS !== 'android') {
      return true;
    }
    
    return foregroundServiceManager.removeTask(taskId);
  },
  
  /**
   * Check if a task is running
   * @param {string} taskId ID of the task to check
   * @returns {boolean} Whether the task is running
   */
  is_task_running: (taskId) => {
    if (Platform.OS !== 'android') {
      return false;
    }
    
    const task = foregroundServiceManager.getTaskInfo(taskId);
    return !!task && !task.isPaused;
  },
  
  /**
   * Remove all tasks
   * @returns {Object} Empty object for backward compatibility
   */
  remove_all_tasks: () => {
    if (Platform.OS !== 'android') {
      return {};
    }
    
    foregroundServiceManager.removeAllTasks();
    return {};
  },
  
  /**
   * Get a task by ID
   * @param {string} taskId ID of the task to get
   * @returns {Object|null} Task or null if not found
   */
  get_task: (taskId) => {
    if (Platform.OS !== 'android') {
      return null;
    }
    
    return foregroundServiceManager.getTaskInfo(taskId);
  },
  
  /**
   * Get all tasks
   * @returns {Object} Object with task IDs as keys and task info as values
   */
  get_all_tasks: () => {
    if (Platform.OS !== 'android') {
      return {};
    }
    
    return foregroundServiceManager.getAllTasks();
  },
  
  /**
   * Add an event listener for notification clicks
   * @param {Function} callback Event callback
   * @returns {Function} Function to remove the listener
   */
  eventListener: (callback) => {
    if (Platform.OS !== 'android') {
      return () => {};
    }
    
    return foregroundServiceManager.addEventListener('notificationClick', callback);
  },
  
  /**
   * Clean up resources
   * @returns {Promise<void>}
   */
  cleanup: async () => {
    if (Platform.OS !== 'android') {
      return;
    }
    
    return await foregroundServiceManager.cleanup();
  },
  
  /**
   * Set whether the service should auto-restart
   * @param {boolean} enabled Whether auto-restart should be enabled
   * @returns {Promise<boolean>} Whether the setting was updated successfully
   */
  setAutoRestart: async (enabled) => {
    if (Platform.OS !== 'android') {
      return false;
    }
    
    return await foregroundServiceManager.setAutoRestart(enabled);
  },
  
  /**
   * Pause a task
   * @param {string} taskId ID of the task to pause
   * @returns {boolean} Whether the task was paused successfully
   */
  pauseTask: (taskId) => {
    if (Platform.OS !== 'android') {
      return true;
    }
    
    return foregroundServiceManager.pauseTask(taskId);
  },
  
  /**
   * Resume a paused task
   * @param {string} taskId ID of the task to resume
   * @returns {boolean} Whether the task was resumed successfully
   */
  resumeTask: (taskId) => {
    if (Platform.OS !== 'android') {
      return true;
    }
    
    return foregroundServiceManager.resumeTask(taskId);
  }
};

// Export the legacy API as default
export default ReactNativeForegroundService;

// Export the modern API components
export {
  foregroundServiceManager as ForegroundServiceManager,
  taskManager as TaskManager,
  serviceRecoveryManager as ServiceRecoveryManager
};

// Export utility for setting up error listener (for backward compatibility)
export function setupServiceErrorListener({ onServiceFailToStart, alert }) {
  if (Platform.OS !== 'android') {
    return () => {};
  }
  
  const removeListener = foregroundServiceManager.addEventListener('error', (event) => {
    if (alert) {
      // Alert is handled internally by ForegroundServiceManager
    }
    
    if (typeof onServiceFailToStart === 'function') {
      onServiceFailToStart(event.error);
    }
  });
  
  return removeListener;
}