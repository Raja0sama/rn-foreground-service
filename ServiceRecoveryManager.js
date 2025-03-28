import { AppState, NativeModules, DeviceEventEmitter, Platform } from 'react-native';
import taskManager from './TaskManager';
import taskScheduler from './TaskScheduler';

// Try to get the recovery module if available
const ServiceRecoveryModule = NativeModules.ServiceRecoveryModule || null;

// Recovery retry settings
const DEFAULT_RECOVERY_CONFIG = {
  // Maximum number of recovery attempts
  maxRecoveryAttempts: 5,
  
  // Initial delay before first recovery attempt (ms)
  initialRecoveryDelay: 1000,
  
  // Maximum delay between recovery attempts (ms)
  maxRecoveryDelay: 60000,
  
  // Whether to use exponential backoff for retry delays
  useExponentialBackoff: true,
  
  // Factor for exponential backoff calculation
  backoffFactor: 2,
  
  // Throttle for frequent recovery attempts (ms)
  recoveryThrottleTime: 30000,
  
  // Whether to attempt recovery when app returns to foreground
  recoverOnForeground: true,
  
  // Whether to periodically check service health
  enableHealthCheck: true,
  
  // Interval for health checks (ms)
  healthCheckInterval: 30000
};

class ServiceRecoveryManager {
  constructor() {
    this.config = { ...DEFAULT_RECOVERY_CONFIG };
    this.recoveryAttempts = 0;
    this.lastRecoveryTime = 0;
    this.lastServiceState = null;
    this.healthCheckTimer = null;
    this.appStateListener = null;
    this.serviceStateListener = null;
    this.listeners = [];
    this.isMonitoring = false;
    this.currentBackoffDelay = this.config.initialRecoveryDelay;
  }

  /**
   * Initialize the recovery manager
   * @param {Object} config Custom configuration
   */
  initialize(config = {}) {
    this.config = { ...this.config, ...config };
    this.setupAppStateListener();
    this.setupServiceStateListener();
    
    if (this.config.enableHealthCheck) {
      this.startHealthCheck();
    }
    
    // Register for native service recovery events if available
    if (Platform.OS === 'android' && ServiceRecoveryModule) {
      DeviceEventEmitter.addListener('ServiceRecoveryEvent', this.handleServiceRecoveryEvent);
    }
    
    this.isMonitoring = true;
    
    // Emit initialization event
    this.emitEvent('initialized', { config: this.config });
  }

  /**
   * Setup listener for app state changes
   */
  setupAppStateListener() {
    // Remove existing listener if any
    if (this.appStateListener) {
      AppState.removeEventListener('change', this.appStateListener);
    }
    
    // Add new listener
    this.appStateListener = nextAppState => {
      if (nextAppState === 'active' && this.config.recoverOnForeground) {
        const now = Date.now();
        const timeSinceLastRecovery = now - this.lastRecoveryTime;
        
        // Only attempt recovery if throttle time has passed
        if (timeSinceLastRecovery > this.config.recoveryThrottleTime) {
          this.checkAndRecoverService();
        }
      }
    };
    
    AppState.addEventListener('change', this.appStateListener);
  }

  /**
   * Setup listener for service state changes
   */
  setupServiceStateListener() {
    // Remove existing listener if any
    if (this.serviceStateListener) {
      this.serviceStateListener();
    }
    
    // Add new listener
    this.serviceStateListener = taskManager.addEventListener('serviceStateChanged', event => {
      this.lastServiceState = {
        isRunning: event.isRunning,
        timestamp: Date.now()
      };
      
      // Reset recovery counters when service starts successfully
      if (event.isRunning) {
        this.recoveryAttempts = 0;
        this.currentBackoffDelay = this.config.initialRecoveryDelay;
      }
    });
  }

  /**
   * Start periodic health checks
   */
  startHealthCheck() {
    this.stopHealthCheck();
    
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);
  }

  /**
   * Stop periodic health checks
   */
  stopHealthCheck() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  /**
   * Perform a health check on the service
   */
  async performHealthCheck() {
    try {
      // Check if service should be running
      const serviceConfig = taskManager.getServiceConfig();
      if (!serviceConfig) {
        return; // No service configured
      }
      
      const isServiceRunning = taskManager.isServiceRunning();
      const serviceRunningNatively = await this.isServiceRunningNatively();
      
      // Detect inconsistencies
      if (isServiceRunning && !serviceRunningNatively) {
        this.emitEvent('serviceError', {
          type: 'service_state_inconsistency',
          message: 'Service reported as running in JS but not running natively'
        });
        
        // Attempt recovery
        this.recoverService(serviceConfig);
      }
    } catch (error) {
      console.warn('Error performing health check:', error);
    }
  }

  /**
   * Check service status and recover if needed
   */
  async checkAndRecoverService() {
    try {
      // If there's a service configuration but the service isn't running, attempt recovery
      const serviceConfig = taskManager.getServiceConfig();
      if (serviceConfig && !taskManager.isServiceRunning()) {
        await this.recoverService(serviceConfig);
      }
    } catch (error) {
      console.warn('Error checking service:', error);
    }
  }

  /**
   * Attempt to recover the service
   * @param {Object} serviceConfig Configuration to restart the service with
   */
  async recoverService(serviceConfig) {
    const now = Date.now();
    
    // Check if we should throttle recovery attempts
    if (now - this.lastRecoveryTime < this.config.recoveryThrottleTime) {
      this.emitEvent('recoveryThrottled', {
        nextAttemptTime: this.lastRecoveryTime + this.config.recoveryThrottleTime
      });
      return;
    }
    
    // Check if we've exceeded max attempts
    if (this.recoveryAttempts >= this.config.maxRecoveryAttempts) {
      this.emitEvent('recoveryMaxAttemptsReached', {
        attempts: this.recoveryAttempts
      });
      return;
    }
    
    this.recoveryAttempts++;
    this.lastRecoveryTime = now;
    
    // Calculate next backoff delay
    if (this.config.useExponentialBackoff) {
      this.currentBackoffDelay = Math.min(
        this.currentBackoffDelay * this.config.backoffFactor,
        this.config.maxRecoveryDelay
      );
    }
    
    this.emitEvent('recoveryAttempt', {
      attempt: this.recoveryAttempts,
      maxAttempts: this.config.maxRecoveryAttempts,
      nextDelay: this.currentBackoffDelay
    });
    
    try {
      // Use native recovery module if available
      if (Platform.OS === 'android' && ServiceRecoveryModule) {
        await ServiceRecoveryModule.restartService(serviceConfig);
      } else {
        // Use the JavaScript implementation
        // 1. Update task manager state
        taskManager.setServiceRunning(true, serviceConfig);
        
        // 2. Restart the scheduler
        if (!taskScheduler.isRunning) {
          taskScheduler.start();
        }
        
        // 3. Force immediate task execution
        taskScheduler.forceExecution();
      }
      
      this.emitEvent('recoverySuccess', {
        attempt: this.recoveryAttempts
      });
    } catch (error) {
      this.emitEvent('recoveryFailed', {
        attempt: this.recoveryAttempts,
        error: error?.message || 'Unknown error',
        willRetry: this.recoveryAttempts < this.config.maxRecoveryAttempts
      });
      
      console.warn('Service recovery failed:', error);
    }
  }

  /**
   * Handle recovery events from native module
   * @param {Object} event Recovery event data
   */
  handleServiceRecoveryEvent = (event) => {
    switch (event.type) {
      case 'service_killed':
        this.emitEvent('serviceKilled', event);
        this.checkAndRecoverService();
        break;
      
      case 'service_restarted':
        this.emitEvent('serviceRestarted', event);
        // Update local state
        if (event.config) {
          taskManager.setServiceRunning(true, event.config);
        }
        break;
      
      case 'recovery_failed':
        this.emitEvent('recoveryFailed', event);
        break;
      
      default:
        this.emitEvent('recoveryEvent', event);
    }
  };

  /**
   * Check if the service is running natively
   * @returns {Promise<boolean>} Whether the service is running at the native level
   */
  async isServiceRunningNatively() {
    try {
      if (Platform.OS === 'android' && ServiceRecoveryModule) {
        return await ServiceRecoveryModule.isServiceRunning();
      } else {
        // Fallback to JS state if native check not available
        return taskManager.isServiceRunning();
      }
    } catch (error) {
      console.warn('Error checking native service status:', error);
      return false;
    }
  }

  /**
   * Reset recovery counters
   */
  resetRecoveryCounters() {
    this.recoveryAttempts = 0;
    this.currentBackoffDelay = this.config.initialRecoveryDelay;
  }

  /**
   * Update recovery configuration
   * @param {Object} newConfig New configuration parameters
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    
    // Restart health check if interval changed
    if (this.config.enableHealthCheck) {
      this.startHealthCheck();
    } else {
      this.stopHealthCheck();
    }
  }

  /**
   * Clean up resources used by the recovery manager
   */
  cleanup() {
    // Remove app state listener
    if (this.appStateListener) {
      AppState.removeEventListener('change', this.appStateListener);
      this.appStateListener = null;
    }
    
    // Remove service state listener
    if (this.serviceStateListener) {
      this.serviceStateListener();
      this.serviceStateListener = null;
    }
    
    // Stop health check
    this.stopHealthCheck();
    
    // Remove event listeners
    DeviceEventEmitter.removeAllListeners('ServiceRecoveryEvent');
    
    this.isMonitoring = false;
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
   * Get current recovery status
   * @returns {Object} Current recovery status
   */
  getStatus() {
    return {
      isMonitoring: this.isMonitoring,
      recoveryAttempts: this.recoveryAttempts,
      lastRecoveryTime: this.lastRecoveryTime,
      currentBackoffDelay: this.currentBackoffDelay,
      lastServiceState: this.lastServiceState,
      config: { ...this.config }
    };
  }
}

// Create singleton instance
const serviceRecoveryManager = new ServiceRecoveryManager();

export default serviceRecoveryManager;