import {
  NativeModules,
  AppRegistry,
  DeviceEventEmitter,
  NativeEventEmitter,
  Alert,
  Platform,
} from 'react-native';

// ANDROID ONLY
// Foreground Service for React Native

const ForegroundServiceModule = NativeModules.ForegroundService;
const eventEmitter = new NativeEventEmitter(ForegroundServiceModule);

/**
 * @typedef {Object} NotificationConfig - Configuration for foreground service notifications
 * @property {number} id - Unique notification id
 * @property {string} title - Notification title
 * @property {string} message - Notification message
 * @property {string} [ServiceType] - Required for Android 14+: camera, connectedDevice, dataSync, health, location,
 *                                   mediaPlayback, mediaProjection, microphone, phoneCall, remoteMessaging,
 *                                   shortService, specialUse, systemExempted
 * @property {boolean} [vibration=false] - Enable vibration for the notification
 * @property {string} [visibility='public'] - private | public | secret
 * @property {string} [icon='ic_notification'] - Small icon name
 * @property {string} [largeIcon='ic_launcher'] - Large icon name
 * @property {string} [importance='max'] - none | min | low | default | high | max
 * @property {string} [number='1'] - Badge number for the notification
 * @property {boolean} [button=false] - Enable primary action button
 * @property {string} [buttonText=''] - Text for primary button
 * @property {string} [buttonOnPress='buttonOnPress'] - Event name when button is pressed
 * @property {boolean} [button2=false] - Enable secondary action button
 * @property {string} [button2Text=''] - Text for secondary button
 * @property {string} [button2OnPress='button2OnPress'] - Event name when button2 is pressed
 * @property {string} [mainOnPress='mainOnPress'] - Event name when notification is pressed
 * @property {Object} [progress] - Progress bar configuration
 * @property {number} progress.max - Maximum progress value
 * @property {number} progress.curr - Current progress value
 * @property {string} [color] - Notification color in hex format (e.g. '#FF0000')
 * @property {boolean} [mainIntentMutable=false] - Whether the main PendingIntent should be mutable
 * @property {boolean} [buttonMutable=false] - Whether the button PendingIntent should be mutable
 * @property {boolean} [button2Mutable=false] - Whether the button2 PendingIntent should be mutable
 */

/**
 * @typedef {Object} TaskConfig - Configuration for background tasks
 * @property {string} taskName - Name of the JS task registered with registerForegroundTask
 * @property {number} [delay=0] - Start task after delay in milliseconds (0 = immediate)
 * @property {boolean} [onLoop=false] - Whether to repeat the task
 * @property {number} [loopDelay=5000] - Delay between task executions when looping
 */

// Enable strict error checking for development
const isDev = __DEV__;

// In-memory task store
let tasks = {};
const DEFAULT_SAMPLING_INTERVAL = 500; // ms
let samplingInterval = DEFAULT_SAMPLING_INTERVAL;
let serviceRunning = false;
let listeners = [];

// Error types for better handling
const ERROR_TYPES = {
  INVALID_CONFIG: 'INVALID_CONFIG',
  SERVICE_ERROR: 'SERVICE_ERROR',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  TASK_ERROR: 'TASK_ERROR',
  UNSUPPORTED_PLATFORM: 'UNSUPPORTED_PLATFORM',
};

// Utility: Generate a random ID for tasks
const generateTaskId = (len = 12) => {
  return 'x'.repeat(len).replace(/[xy]/g, c => {
    let r = (Math.random() * 16) | 0,
      v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// Utility: Validate service type for Android 14+
const validateServiceType = (serviceType) => {
  if (!serviceType) return false;
  
  const validTypes = [
    'camera', 'connectedDevice', 'dataSync', 'health', 'location', 
    'mediaPlayback', 'mediaProjection', 'microphone', 'phoneCall', 
    'remoteMessaging', 'shortService', 'specialUse', 'systemExempted'
  ];
  
  return validTypes.includes(serviceType);
};

// Utility: Delete a task from the store
const deleteTask = taskId => {
  if (tasks[taskId]) {
    delete tasks[taskId];
    return true;
  }
  return false;
};

// Task execution engine
const taskRunner = async () => {
  try {
    if (!serviceRunning) return;

    const now = Date.now();
    const pendingTasks = [];

    // Collect all tasks that are ready to execute
    Object.entries(tasks).forEach(([taskId, task]) => {
      if (now >= task.nextExecutionTime) {
        pendingTasks.push({
          id: taskId,
          task: task.task,
          onSuccess: task.onSuccess,
          onError: task.onError,
          onLoop: task.onLoop,
          delay: task.delay,
        });
        
        // Update nextExecutionTime for looping tasks
        if (task.onLoop) {
          tasks[taskId].nextExecutionTime = now + task.delay;
        } else {
          // Mark non-looping tasks for deletion after execution
          tasks[taskId].shouldDelete = true;
        }
      }
    });

    // Execute each task individually to isolate errors
    for (const pendingTask of pendingTasks) {
      try {
        const result = await Promise.resolve(pendingTask.task());
        if (typeof pendingTask.onSuccess === 'function') {
          pendingTask.onSuccess(result);
        }
      } catch (error) {
        // Handle individual task errors
        if (typeof pendingTask.onError === 'function') {
          pendingTask.onError(error);
        }
        
        // Emit task error event
        emitEvent('onTaskError', {
          taskId: pendingTask.id,
          error: error?.message || 'Unknown task error',
        });
        
        if (isDev) {
          console.warn(`[ForegroundService] Task error (${pendingTask.id}):`, error);
        }
      }
    }
    
    // Clean up any tasks marked for deletion
    Object.entries(tasks).forEach(([taskId, task]) => {
      if (task.shouldDelete) {
        deleteTask(taskId);
      }
    });
  } catch (error) {
    // Handle errors in the taskRunner itself
    emitEvent('onServiceError', {
      error: error?.message || 'Unknown error in task runner',
    });
    
    if (isDev) {
      console.error('[ForegroundService] Task runner error:', error);
    }
  }
};

// Emit event to subscribers
const emitEvent = (eventName, params = {}) => {
  try {
    DeviceEventEmitter.emit(eventName, params);
  } catch (error) {
    if (isDev) {
      console.error(`[ForegroundService] Error emitting event ${eventName}:`, error);
    }
  }
};

// Register the task runner with React Native
const register = ({ config }) => {
  if (Platform.OS !== 'android') {
    if (isDev) {
      console.warn('[ForegroundService] This module only works on Android');
    }
    return;
  }
  
  if (!serviceRunning) {
    const { alert, onServiceErrorCallBack } = config || {};
    
    setupServiceErrorListener({
      alert,
      onServiceFailToStart: onServiceErrorCallBack,
    });
    
    // Set custom sampling interval if provided
    if (config?.samplingInterval && typeof config.samplingInterval === 'number') {
      samplingInterval = Math.max(100, config.samplingInterval); // Min 100ms to prevent excessive CPU usage
    }
    
    return AppRegistry.registerHeadlessTask('myTaskName', () => taskRunner);
  }
};

// Check and request notification permission if needed (for Android 13+)
const ensureNotificationPermission = async () => {
  if (Platform.OS !== 'android' || Platform.Version < 33) {
    return true; // Permission not needed for Android < 13
  }
  
  try {
    const hasPermission = await ForegroundServiceModule.hasNotificationPermission();
    
    if (!hasPermission) {
      // This must be followed by a request in the app's UI using a permissions library
      // We can't request it directly from here due to React Native limitations
      return false;
    }
    
    return true;
  } catch (error) {
    if (isDev) {
      console.warn('[ForegroundService] Error checking notification permission:', error);
    }
    return false;
  }
};

// Start the foreground service
const start = async (config) => {
  if (Platform.OS !== 'android') {
    if (isDev) {
      console.warn('[ForegroundService] This module only works on Android');
    }
    return false;
  }
  
  try {
    if (!config || typeof config !== 'object') {
      throw new Error('Invalid configuration object');
    }
    
    // Extract configuration with defaults
    const {
      id,
      title = id,
      message = 'Foreground Service Running...',
      ServiceType,
      vibration = false,
      visibility = 'public',
      icon = 'ic_notification',
      largeIcon = 'ic_launcher',
      importance = 'max',
      number = '1',
      button = false,
      buttonText = '',
      buttonOnPress = 'buttonOnPress',
      button2 = false,
      button2Text = '',
      button2OnPress = 'button2OnPress',
      mainOnPress = 'mainOnPress',
      progress,
      color,
      mainIntentMutable = false,
      buttonMutable = false,
      button2Mutable = false,
    } = config;
    
    // Validate required parameters
    if (!id) {
      throw new Error('id is required');
    }
    
    // Validate service type for Android 14+
    if (Platform.Version >= 34 && !validateServiceType(ServiceType)) {
      throw new Error(
        `Invalid or missing ServiceType. For Android 14+, you must specify a valid type: ` +
        `camera, connectedDevice, dataSync, health, location, mediaPlayback, mediaProjection, ` +
        `microphone, phoneCall, remoteMessaging, shortService, specialUse, systemExempted`
      );
    }
    
    // Check notification permission for Android 13+
    const hasPermission = await ensureNotificationPermission();
    if (!hasPermission) {
      throw new Error(
        'Notification permission denied. This is required for foreground services on Android 13+.'
      );
    }
    
    if (!serviceRunning) {
      // Start the foreground service
      await ForegroundServiceModule.startService({
        id,
        title,
        message,
        ServiceType,
        vibration,
        visibility,
        icon,
        largeIcon,
        importance,
        number,
        button,
        buttonText,
        buttonOnPress,
        button2,
        button2Text,
        button2OnPress,
        mainOnPress,
        progressBar: !!progress,
        progressBarMax: progress?.max,
        progressBarCurr: progress?.curr,
        color,
        mainIntentMutable,
        buttonMutable,
        button2Mutable,
      });
      
      serviceRunning = true;
      
      // Start the task runner
      await ForegroundServiceModule.runTask({
        taskName: 'myTaskName',
        delay: samplingInterval,
        loopDelay: samplingInterval,
        onLoop: true,
      });
      
      return true;
    } else {
      if (isDev) {
        console.log('[ForegroundService] Service is already running');
      }
      return true;
    }
  } catch (error) {
    if (isDev) {
      console.error('[ForegroundService] Start error:', error);
    }
    
    emitEvent('onServiceError', {
      error: error?.message || 'Unknown error starting service',
    });
    
    throw error;
  }
};

// Update an existing notification
const update = async (config) => {
  if (Platform.OS !== 'android') {
    if (isDev) {
      console.warn('[ForegroundService] This module only works on Android');
    }
    return false;
  }
  
  try {
    if (!config || typeof config !== 'object') {
      throw new Error('Invalid configuration object');
    }
    
    // Extract configuration with defaults (similar to start)
    const {
      id,
      title = id,
      message = 'Foreground Service Running...',
      ServiceType,
      vibration = false,
      visibility = 'public',
      largeIcon = 'ic_launcher',
      icon = 'ic_launcher',
      importance = 'max',
      number = '0',
      button = false,
      buttonText = '',
      buttonOnPress = 'buttonOnPress',
      button2 = false,
      button2Text = '',
      button2OnPress = 'button2OnPress',
      mainOnPress = 'mainOnPress',
      progress,
      color,
      mainIntentMutable = false,
      buttonMutable = false,
      button2Mutable = false,
    } = config;
    
    // Validate required parameters
    if (!id) {
      throw new Error('id is required');
    }
    
    await ForegroundServiceModule.updateNotification({
      id,
      title,
      message,
      ServiceType,
      vibration,
      visibility,
      largeIcon,
      icon,
      importance,
      number,
      button,
      buttonText,
      buttonOnPress,
      button2,
      button2Text,
      button2OnPress,
      mainOnPress,
      progressBar: !!progress,
      progressBarMax: progress?.max,
      progressBarCurr: progress?.curr,
      color,
      mainIntentMutable,
      buttonMutable,
      button2Mutable,
    });
    
    // If service wasn't running, restart the task runner
    if (!serviceRunning) {
      serviceRunning = true;
      await ForegroundServiceModule.runTask({
        taskName: 'myTaskName',
        delay: samplingInterval,
        loopDelay: samplingInterval,
        onLoop: true,
      });
    }
    
    return true;
  } catch (error) {
    if (isDev) {
      console.error('[ForegroundService] Update error:', error);
    }
    
    emitEvent('onServiceError', {
      error: error?.message || 'Unknown error updating notification',
    });
    
    throw error;
  }
};

// Stop the foreground service (single instance)
const stop = async () => {
  if (Platform.OS !== 'android') return;
  
  try {
    serviceRunning = false;
    return await ForegroundServiceModule.stopService();
  } catch (error) {
    if (isDev) {
      console.error('[ForegroundService] Stop error:', error);
    }
    throw error;
  }
};

// Stop all foreground service instances
const stopAll = async () => {
  if (Platform.OS !== 'android') return;
  
  try {
    serviceRunning = false;
    return await ForegroundServiceModule.stopServiceAll();
  } catch (error) {
    if (isDev) {
      console.error('[ForegroundService] StopAll error:', error);
    }
    throw error;
  }
};

// Check if service is running
const is_running = () => serviceRunning;

// Add a task to be executed by the service
const add_task = (
  task,
  {
    delay = 5000,
    onLoop = false,
    taskId = generateTaskId(),
    onSuccess = () => {},
    onError = () => {},
  } = {}
) => {
  // Validate task is a function
  const taskType = typeof task;
  if (taskType !== 'function') {
    throw new Error(`Invalid task of type ${taskType}, expected a function or a Promise`);
  }
  
  // Don't allow duplicate task IDs
  if (tasks[taskId]) {
    if (isDev) {
      console.warn(`[ForegroundService] Task ID ${taskId} already exists. Overwriting.`);
    }
  }
  
  // Calculate next execution time
  const adjustedDelay = Math.max(0, Math.ceil(delay / samplingInterval) * samplingInterval);
  
  // Add task to the registry
  tasks[taskId] = {
    task,
    nextExecutionTime: Date.now() + adjustedDelay,
    delay: Math.max(samplingInterval, adjustedDelay),
    onLoop,
    taskId,
    onSuccess: typeof onSuccess === 'function' ? onSuccess : () => {},
    onError: typeof onError === 'function' ? onError : () => {},
  };
  
  return taskId;
};

// Update an existing task
const update_task = (
  task,
  {
    delay = 5000,
    onLoop = false,
    taskId,
    onSuccess = () => {},
    onError = () => {},
  } = {}
) => {
  // Require taskId for updates
  if (!taskId) {
    throw new Error('taskId is required to update a task');
  }
  
  // Validate task is a function
  const taskType = typeof task;
  if (taskType !== 'function') {
    throw new Error(`Invalid task of type ${taskType}, expected a function or a Promise`);
  }
  
  // Calculate next execution time
  const adjustedDelay = Math.max(0, Math.ceil(delay / samplingInterval) * samplingInterval);
  
  // Update task in the registry
  tasks[taskId] = {
    task,
    nextExecutionTime: Date.now() + adjustedDelay,
    delay: Math.max(samplingInterval, adjustedDelay),
    onLoop,
    taskId,
    onSuccess: typeof onSuccess === 'function' ? onSuccess : () => {},
    onError: typeof onError === 'function' ? onError : () => {},
  };
  
  return taskId;
};

// Remove a task from execution
const remove_task = taskId => {
  const removed = deleteTask(taskId);
  if (!removed && isDev) {
    console.warn(`[ForegroundService] Task ID ${taskId} not found.`);
  }
  return removed;
};

// Check if a task is scheduled
const is_task_running = taskId => !!tasks[taskId];

// Remove all scheduled tasks
const remove_all_tasks = () => {
  tasks = {};
  return true;
};

// Get a specific task configuration
const get_task = taskId => tasks[taskId];

// Get all scheduled tasks
const get_all_tasks = () => ({ ...tasks });

// Add an event listener for notification clicks
const eventListener = callBack => {
  if (typeof callBack !== 'function') {
    throw new Error('eventListener callback must be a function');
  }
  
  const subscription = DeviceEventEmitter.addListener(
    'notificationClickHandle',
    callBack
  );
  
  listeners.push(subscription);
  
  // Return cleanup function
  return () => {
    subscription.remove();
    listeners = listeners.filter(listener => listener !== subscription);
  };
};

// Setup error listener
function setupServiceErrorListener({ onServiceFailToStart, alert }) {
  const listener = eventEmitter.addListener('onServiceError', message => {
    if (alert) {
      Alert.alert('Service Error', message);
    }
    
    if (typeof onServiceFailToStart === 'function') {
      onServiceFailToStart(message);
    }
    
    // Auto-stop on critical errors
    stop().catch(err => {
      if (isDev) {
        console.error('[ForegroundService] Error stopping service after error:', err);
      }
    });
  });
  
  listeners.push(listener);
  
  return () => {
    listener.remove();
    listeners = listeners.filter(l => l !== listener);
  };
}

// Request notification permission explicitly (for Android 13+)
const requestNotificationPermission = async () => {
  if (Platform.OS !== 'android' || Platform.Version < 33) {
    return true; // Not required
  }
  
  // This function is a placeholder - actual permission requesting
  // must be done using a permissions library in the app
  throw new Error(
    'For Android 13+, you must manually request POST_NOTIFICATIONS permission using a permissions library. ' +
    'Foreground Service cannot run without this permission.'
  );
};

// Clean up resources (call before app unmounts)
const cleanup = () => {
  // Remove all event listeners
  listeners.forEach(listener => {
    try {
      listener.remove();
    } catch (error) {
      if (isDev) {
        console.warn('[ForegroundService] Error removing listener:', error);
      }
    }
  });
  
  listeners = [];
  
  // Stop service if running
  if (serviceRunning) {
    return stopAll().catch(error => {
      if (isDev) {
        console.error('[ForegroundService] Error during cleanup:', error);
      }
    });
  }
  
  return Promise.resolve();
};

// Export public API
const ReactNativeForegroundService = {
  register,
  start,
  update,
  stop,
  stopAll,
  is_running,
  add_task,
  update_task,
  remove_task,
  is_task_running,
  remove_all_tasks,
  get_task,
  get_all_tasks,
  eventListener,
  cleanup,
  requestNotificationPermission,
  ERROR_TYPES,
};

export default ReactNativeForegroundService;
export { setupServiceErrorListener };