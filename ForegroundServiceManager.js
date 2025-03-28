import { Platform, NativeModules, AppRegistry, DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import taskManager from './TaskManager';
import taskScheduler from './TaskScheduler';
import serviceRecoveryManager from './ServiceRecoveryManager';

// Get the native module
const ForegroundServiceModule = NativeModules.ForegroundService;

// Storage keys
const STORAGE_KEYS = {
  LAST_CONFIG: '@ForegroundService:lastConfig',
  AUTO_RESTART: '@ForegroundService:autoRestart',
};

// Default configuration
const DEFAULT_CONFIG = {
  // Whether to enable service recovery features
  enableServiceRecovery: true,
  
  // Whether to automatically restart service on app startup
  autoRestartOnBoot: false,
  
  // Whether to attempt to restart service when app comes to foreground
  restartOnForeground: true,
  
  // Whether to show alerts for errors
  showErrorAlerts: true,
  
  // Custom error handler
  onServiceError: null,
  
  // Sampling interval for task execution (ms)
  taskSamplingInterval: 500,
  
  // Whether to log debug information
  enableDebugLogging: __DEV__,
};

class ForegroundServiceManager {
  constructor() {
    this.isInitialized = false;
    this.config = { ...DEFAULT_CONFIG };
    this.lastStartConfig = null;
    this.autoRestart = false;
    this.listeners = {};
    this.eventListeners = [];
  }

  /**
   * Initialize the foreground service manager
   * @param {Object} config Custom configuration
   * @returns {Promise<void>}
   */
  async initialize(config = {}) {
    if (this.isInitialized) return;
    
    try {
      // Apply configuration
      this.config = { ...this.config, ...config };
      
      // Restore saved state if on Android
      if (Platform.OS === 'android') {
        // Initialize task manager first
        await taskManager.initialize();
        
        // Restore auto-restart setting
        const autoRestartStr = await AsyncStorage.getItem(STORAGE_KEYS.AUTO_RESTART);
        if (autoRestartStr) {
          this.autoRestart = JSON.parse(autoRestartStr);
        } else {
          this.autoRestart = this.config.autoRestartOnBoot;
          await AsyncStorage.setItem(STORAGE_KEYS.AUTO_RESTART, JSON.stringify(this.autoRestart));
        }
        
        // Restore last service configuration
        const lastConfigStr = await AsyncStorage.getItem(STORAGE_KEYS.LAST_CONFIG);
        if (lastConfigStr) {
          this.lastStartConfig = JSON.parse(lastConfigStr);
        }
        
        // Register the task runner with React Native
        AppRegistry.registerHeadlessTask('myTaskName', () => this.executeTaskRunner);
        
        // Initialize supporting managers
        if (this.config.enableServiceRecovery) {
          serviceRecoveryManager.initialize({
            recoverOnForeground: this.config.restartOnForeground
          });
        }
        
        // Set up task scheduler with proper configuration
        taskScheduler.updateConfig({
          minInterval: this.config.taskSamplingInterval,
          adaptiveScheduling: true
        });
        
        // Auto-restart service if enabled
        if (this.autoRestart && this.lastStartConfig) {
          this.debug('Auto-restarting service from saved config');
          await this.startService(this.lastStartConfig);
        }
        
        // Set up error listener
        this.setupErrorListener();
      }
      
      this.isInitialized = true;
      this.debug('ForegroundServiceManager initialized');
      
      // Emit initialization event
      this.emitEvent('initialized', { 
        config: this.config,
        autoRestart: this.autoRestart,
        hasLastConfig: !!this.lastStartConfig
      });
      
      return true;
    } catch (error) {
      this.handleError('initialization_error', error);
      return false;
    }
  }

  /**
   * Set up error listener
   */
  setupErrorListener() {
    // Listen for service errors
    const errorListener = DeviceEventEmitter.addListener('onServiceError', error => {
      this.handleError('service_error', error);
    });
    
    this.eventListeners.push(errorListener);
  }

  /**
   * Handle errors in a standardized way
   * @param {string} type Error type
   * @param {Error|string} error Error object or message
   */
  handleError(type, error) {
    const errorMessage = error?.message || error || 'Unknown error';
    
    // Log the error
    console.error(`[ForegroundService] ${type}: ${errorMessage}`);
    
    // Show alert if enabled
    if (this.config.showErrorAlerts && Platform.OS === 'android') {
      // Use NativeModules for alert to ensure it works in headless context
      if (NativeModules.DialogManagerAndroid) {
        NativeModules.DialogManagerAndroid.showAlert(
          { title: 'Foreground Service Error', message: errorMessage },
          () => {},
          () => {}
        );
      }
    }
    
    // Call custom error handler if provided
    if (typeof this.config.onServiceError === 'function') {
      try {
        this.config.onServiceError({ type, error: errorMessage });
      } catch (handlerError) {
        console.error('[ForegroundService] Error in custom error handler:', handlerError);
      }
    }
    
    // Emit error event
    this.emitEvent('error', { type, error: errorMessage });
  }

  /**
   * Start the foreground service
   * @param {Object} config Service configuration
   * @returns {Promise<boolean>} Whether the service was started successfully
   */
  async startService(config) {
    if (!this.isInitialized) {
      throw new Error('ForegroundServiceManager not initialized. Call initialize() first.');
    }
    
    if (Platform.OS !== 'android') {
      return false;
    }
    
    try {
      // Validate configuration
      if (!config || typeof config !== 'object') {
        throw new Error('Invalid service configuration');
      }
      
      if (!config.id) {
        throw new Error('Service configuration must include an id');
      }
      
      // Validate ServiceType for Android 14+
      if (Platform.Version >= 34 && !config.ServiceType) {
        throw new Error('ServiceType is required for Android 14+');
      }
      
      // Start the service
      await ForegroundServiceModule.startService(config);
      
      // Save the configuration for potential restart
      this.lastStartConfig = { ...config };
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_CONFIG, JSON.stringify(this.lastStartConfig));
      
      // Update task manager state
      taskManager.setServiceRunning(true, config);
      
      // Start the task scheduler
      taskScheduler.start();
      
      this.debug('Foreground service started');
      
      // Emit event
      this.emitEvent('serviceStarted', { config });
      
      return true;
    } catch (error) {
      this.handleError('start_service_error', error);
      return false;
    }
  }

  /**
   * Update the foreground service notification
   * @param {Object} config Updated notification configuration
   * @returns {Promise<boolean>} Whether the update was successful
   */
  async updateNotification(config) {
    if (!this.isInitialized) {
      throw new Error('ForegroundServiceManager not initialized. Call initialize() first.');
    }
    
    if (Platform.OS !== 'android') {
      return false;
    }
    
    try {
      // Validate configuration
      if (!config || typeof config !== 'object') {
        throw new Error('Invalid notification configuration');
      }
      
      if (!config.id) {
        throw new Error('Notification configuration must include an id');
      }
      
      // Validate ServiceType for Android 14+
      if (Platform.Version >= 34 && !config.ServiceType) {
        throw new Error('ServiceType is required for Android 14+');
      }
      
      // Update the notification
      await ForegroundServiceModule.updateNotification(config);
      
      // Update saved configuration
      if (this.lastStartConfig && this.lastStartConfig.id === config.id) {
        this.lastStartConfig = { ...this.lastStartConfig, ...config };
        await AsyncStorage.setItem(STORAGE_KEYS.LAST_CONFIG, JSON.stringify(this.lastStartConfig));
      }
      
      this.debug('Notification updated');
      
      // Emit event
      this.emitEvent('notificationUpdated', { config });
      
      return true;
    } catch (error) {
      this.handleError('update_notification_error', error);
      return false;
    }
  }

  /**
   * Stop the foreground service
   * @returns {Promise<boolean>} Whether the service was stopped successfully
   */
  async stopService() {
    if (!this.isInitialized) {
      throw new Error('ForegroundServiceManager not initialized. Call initialize() first.');
    }
    
    if (Platform.OS !== 'android') {
      return false;
    }
    
    try {
      // Stop the service
      await ForegroundServiceModule.stopService();
      
      // Update task manager state
      taskManager.setServiceRunning(false);
      
      // Stop the task scheduler
      taskScheduler.stop();
      
      this.debug('Foreground service stopped');
      
      // Emit event
      this.emitEvent('serviceStopped', {});
      
      return true;
    } catch (error) {
      this.handleError('stop_service_error', error);
      return false;
    }
  }

  /**
   * Stop all instances of the foreground service
   * @returns {Promise<boolean>} Whether all services were stopped successfully
   */
  async stopAllServices() {
    if (!this.isInitialized) {
      throw new Error('ForegroundServiceManager not initialized. Call initialize() first.');
    }
    
    if (Platform.OS !== 'android') {
      return false;
    }
    
    try {
      // Stop all services
      await ForegroundServiceModule.stopServiceAll();
      
      // Update task manager state
      taskManager.setServiceRunning(false);
      
      // Stop the task scheduler
      taskScheduler.stop();
      
      this.debug('All foreground services stopped');
      
      // Emit event
      this.emitEvent('allServicesStopped', {});
      
      return true;
    } catch (error) {
      this.handleError('stop_all_services_error', error);
      return false;
    }
  }

  /**
   * Add a task to be executed by the service
   * @param {Function} task Task function to execute
   * @param {Object} options Task options
   * @returns {string} Task ID
   */
  addTask(task, options = {}) {
    if (!this.isInitialized) {
      throw new Error('ForegroundServiceManager not initialized. Call initialize() first.');
    }
    
    try {
      return taskManager.addTask(task, options);
    } catch (error) {
      this.handleError('add_task_error', error);
      throw error;
    }
  }

  /**
   * Update an existing task
   * @param {string} taskId ID of the task to update
   * @param {Function} task New task function
   * @param {Object} options New task options
   * @returns {boolean} Whether the task was updated successfully
   */
  updateTask(taskId, task, options = {}) {
    if (!this.isInitialized) {
      throw new Error('ForegroundServiceManager not initialized. Call initialize() first.');
    }
    
    try {
      return taskManager.updateTask(taskId, task, options);
    } catch (error) {
      this.handleError('update_task_error', error);
      throw error;
    }
  }

  /**
   * Remove a task
   * @param {string} taskId ID of the task to remove
   * @returns {boolean} Whether the task was removed successfully
   */
  removeTask(taskId) {
    if (!this.isInitialized) {
      throw new Error('ForegroundServiceManager not initialized. Call initialize() first.');
    }
    
    try {
      return taskManager.removeTask(taskId);
    } catch (error) {
      this.handleError('remove_task_error', error);
      throw error;
    }
  }

  /**
   * Pause a task
   * @param {string} taskId ID of the task to pause
   * @returns {boolean} Whether the task was paused successfully
   */
  pauseTask(taskId) {
    if (!this.isInitialized) {
      throw new Error('ForegroundServiceManager not initialized. Call initialize() first.');
    }
    
    try {
      return taskManager.pauseTask(taskId);
    } catch (error) {
      this.handleError('pause_task_error', error);
      throw error;
    }
  }

  /**
   * Resume a paused task
   * @param {string} taskId ID of the task to resume
   * @returns {boolean} Whether the task was resumed successfully
   */
  resumeTask(taskId) {
    if (!this.isInitialized) {
      throw new Error('ForegroundServiceManager not initialized. Call initialize() first.');
    }
    
    try {
      return taskManager.resumeTask(taskId);
    } catch (error) {
      this.handleError('resume_task_error', error);
      throw error;
    }
  }

  /**
   * Remove all tasks
   */
  removeAllTasks() {
    if (!this.isInitialized) {
      throw new Error('ForegroundServiceManager not initialized. Call initialize() first.');
    }
    
    try {
      taskManager.removeAllTasks();
    } catch (error) {
      this.handleError('remove_all_tasks_error', error);
      throw error;
    }
  }

  /**
   * Check if the service is running
   * @returns {boolean} Whether the service is running
   */
  isServiceRunning() {
    if (!this.isInitialized) {
      return false;
    }
    
    return taskManager.isServiceRunning();
  }

  /**
   * Get information about a task
   * @param {string} taskId ID of the task to get
   * @returns {Object|null} Task information or null if not found
   */
  getTaskInfo(taskId) {
    if (!this.isInitialized) {
      throw new Error('ForegroundServiceManager not initialized. Call initialize() first.');
    }
    
    return taskManager.getTask(taskId);
  }

  /**
   * Get information about all tasks
   * @returns {Object} Object with task IDs as keys and task info as values
   */
  getAllTasks() {
    if (!this.isInitialized) {
      throw new Error('ForegroundServiceManager not initialized. Call initialize() first.');
    }
    
    return taskManager.getAllTasks();
  }

  /**
   * Set whether the service should auto-restart on boot
   * @param {boolean} enabled Whether auto-restart should be enabled
   * @returns {Promise<boolean>} Whether the setting was updated successfully
   */
  async setAutoRestart(enabled) {
    if (!this.isInitialized) {
      throw new Error('ForegroundServiceManager not initialized. Call initialize() first.');
    }
    
    if (Platform.OS !== 'android') {
      return false;
    }
    
    try {
      this.autoRestart = !!enabled;
      await AsyncStorage.setItem(STORAGE_KEYS.AUTO_RESTART, JSON.stringify(this.autoRestart));
      
      this.debug(`Auto-restart ${enabled ? 'enabled' : 'disabled'}`);
      
      // Emit event
      this.emitEvent('autoRestartChanged', { enabled: this.autoRestart });
      
      return true;
    } catch (error) {
      this.handleError('set_auto_restart_error', error);
      return false;
    }
  }

  /**
   * Add an event listener
   * @param {string} eventType Event type to listen for
   * @param {Function} callback Callback function
   * @returns {Function} Function to remove the listener
   */
  addEventListener(eventType, callback) {
    if (typeof callback !== 'function') {
      throw new Error('Event listener callback must be a function');
    }
    
    if (!this.listeners[eventType]) {
      this.listeners[eventType] = [];
    }
    
    this.listeners[eventType].push(callback);
    
    // Return function to remove this listener
    return () => {
      this.removeEventListener(eventType, callback);
    };
  }

  /**
   * Remove an event listener
   * @param {string} eventType Event type
   * @param {Function} callback Callback function to remove
   */
  removeEventListener(eventType, callback) {
    if (!this.listeners[eventType]) {
      return;
    }
    
    this.listeners[eventType] = this.listeners[eventType].filter(
      listener => listener !== callback
    );
    
    if (this.listeners[eventType].length === 0) {
      delete this.listeners[eventType];
    }
  }

  /**
   * Emit an event to all registered listeners
   * @param {string} eventType Event type to emit
   * @param {Object} data Event data
   */
  emitEvent(eventType, data = {}) {
    if (!this.listeners[eventType]) {
      return;
    }
    
    // Clone listeners array to prevent issues if listeners are added/removed during execution
    const listeners = [...this.listeners[eventType]];
    
    for (const listener of listeners) {
      try {
        listener({ type: eventType, ...data });
      } catch (error) {
        console.warn(`Error in ${eventType} event listener:`, error);
      }
    }
  }

  /**
   * Execute task runner - this is the headless task function
   * This will be called by React Native's headless task mechanism
   */
  executeTaskRunner = async () => {
    try {
      // Execute due tasks
      await taskManager.executeDueTasks();
      return null;
    } catch (error) {
      console.error('[ForegroundService] Error in task runner:', error);
      return null;
    }
  };

  /**
   * Log debug message if debug logging is enabled
   * @param {string} message Debug message
   */
  debug(message) {
    if (this.config.enableDebugLogging) {
      console.log(`[ForegroundService] ${message}`);
    }
  }

  /**
   * Clean up resources
   */
  async cleanup() {
    if (!this.isInitialized) {
      return;
    }
    
    try {
      // Stop task scheduler
      taskScheduler.stop();
      
      // Clean up service recovery manager
      if (this.config.enableServiceRecovery) {
        serviceRecoveryManager.cleanup();
      }
      
      // Remove event listeners
      this.eventListeners.forEach(listener => {
        listener.remove();
      });
      this.eventListeners = [];
      
      // Clear listeners
      this.listeners = {};
      
      this.debug('Resources cleaned up');
    } catch (error) {
      console.error('[ForegroundService] Error during cleanup:', error);
    }
  }
}

// Create singleton instance
const foregroundServiceManager = new ForegroundServiceManager();

export default foregroundServiceManager;