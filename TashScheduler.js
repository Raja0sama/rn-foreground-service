import { AppState, Platform } from 'react-native';
import taskManager from './TaskManager';

// Default scheduler configuration
const DEFAULT_CONFIG = {
  // Minimum interval between task checks (ms)
  minInterval: 500,
  
  // Maximum interval between task checks (ms) when idle
  maxInterval: 5000,
  
  // How much to increase the interval each step in idle mode
  intervalStep: 500,
  
  // Maximum concurrent tasks to execute
  maxConcurrentTasks: 3,
  
  // Whether to adapt scheduling interval based on app state
  adaptiveScheduling: true
};

class TaskScheduler {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.isRunning = false;
    this.schedulerTimer = null;
    this.currentInterval = this.config.minInterval;
    this.lastExecutionTime = 0;
    this.idleTime = 0;
    this.appState = 'active';
    this.appStateListener = null;
    this.pendingPromises = [];
  }

  /**
   * Start the task scheduler
   */
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.currentInterval = this.config.minInterval;
    this.lastExecutionTime = Date.now();
    
    // Set up app state monitoring
    if (this.config.adaptiveScheduling) {
      this.setupAppStateMonitoring();
    }
    
    // Schedule first execution
    this.scheduleNextExecution();
    
    console.log('Task scheduler started');
  }

  /**
   * Stop the task scheduler
   */
  stop() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    // Clear scheduler timer
    if (this.schedulerTimer) {
      clearTimeout(this.schedulerTimer);
      this.schedulerTimer = null;
    }
    
    // Remove app state listener
    if (this.appStateListener) {
      AppState.removeEventListener('change', this.appStateListener);
      this.appStateListener = null;
    }
    
    // Wait for any pending promises to complete
    Promise.all(this.pendingPromises).catch(() => {
      // Ignore errors from pending promises
    }).finally(() => {
      this.pendingPromises = [];
      console.log('Task scheduler stopped');
    });
  }

  /**
   * Set up monitoring of app state for adaptive scheduling
   */
  setupAppStateMonitoring() {
    if (this.appStateListener) {
      AppState.removeEventListener('change', this.appStateListener);
    }
    
    this.appStateListener = nextAppState => {
      this.appState = nextAppState;
      
      // Reset interval when app comes to foreground
      if (nextAppState === 'active') {
        this.currentInterval = this.config.minInterval;
        this.idleTime = 0;
        
        // Force immediate execution
        if (this.schedulerTimer) {
          clearTimeout(this.schedulerTimer);
          this.schedulerTimer = null;
        }
        this.scheduleNextExecution(0);
      } 
      // Increase interval when app goes to background
      else if (nextAppState === 'background') {
        this.currentInterval = Math.min(
          this.currentInterval + this.config.intervalStep * 2,
          this.config.maxInterval
        );
      }
    };
    
    AppState.addEventListener('change', this.appStateListener);
  }

  /**
   * Schedule the next execution of the task scheduler
   * @param {number} delay Optional delay override
   */
  scheduleNextExecution(delay = null) {
    if (!this.isRunning) return;
    
    // Clear existing timer if any
    if (this.schedulerTimer) {
      clearTimeout(this.schedulerTimer);
    }
    
    // Calculate appropriate interval based on system state
    const interval = delay !== null ? delay : this.calculateInterval();
    
    // Schedule execution
    this.schedulerTimer = setTimeout(async () => {
      await this.executeTasks();
      this.scheduleNextExecution();
    }, interval);
  }

  /**
   * Calculate appropriate interval based on system state
   * @returns {number} Interval in milliseconds
   */
  calculateInterval() {
    // Start with current interval
    let interval = this.currentInterval;
    
    // Adjust based on idle time
    if (this.config.adaptiveScheduling) {
      const now = Date.now();
      const timeSinceLastExecution = now - this.lastExecutionTime;
      
      // If there has been activity, reset idle time
      if (timeSinceLastExecution < this.currentInterval * 1.5) {
        this.idleTime = 0;
      } else {
        this.idleTime += timeSinceLastExecution;
      }
      
      // Gradually increase interval when idle
      if (this.idleTime > 10000) { // 10 seconds of idle time
        interval = Math.min(
          interval + this.config.intervalStep,
          this.config.maxInterval
        );
      } else {
        interval = this.config.minInterval;
      }
    }
    
    // Adjust based on app state
    if (this.appState === 'background') {
      interval = Math.min(interval * 2, this.config.maxInterval);
    }
    
    return interval;
  }

  /**
   * Execute due tasks
   */
  async executeTasks() {
    if (!this.isRunning || !taskManager.isServiceRunning()) {
      return;
    }
    
    try {
      this.lastExecutionTime = Date.now();
      
      // Get all tasks and filter for those that are due
      const allTasks = taskManager.getAllTasks();
      const now = Date.now();
      
      const dueTasks = Object.entries(allTasks)
        .filter(([_, task]) => !task.isPaused && now >= task.nextExecutionTime)
        .map(([taskId]) => taskId);
      
      // Sort tasks by priority
      const sortedTasks = dueTasks.sort((a, b) => {
        const priorityMap = { high: 0, normal: 1, low: 2 };
        const taskA = taskManager.getTask(a);
        const taskB = taskManager.getTask(b);
        return (priorityMap[taskA.priority] || 1) - (priorityMap[taskB.priority] || 1);
      });
      
      // Execute tasks with concurrency limit
      const taskBatches = [];
      while (sortedTasks.length > 0) {
        const batch = sortedTasks.splice(0, this.config.maxConcurrentTasks);
        taskBatches.push(batch);
      }
      
      for (const batch of taskBatches) {
        // Execute each batch concurrently
        const promises = batch.map(taskId => {
          const promise = taskManager.executeTaskWithTimeout(taskId).catch(error => {
            // Log but don't rethrow to prevent one task from stopping others
            console.warn(`Task ${taskId} failed:`, error);
          }).finally(() => {
            // Remove from pending promises when done
            this.pendingPromises = this.pendingPromises.filter(p => p !== promise);
          });
          
          // Keep track of pending promises
          this.pendingPromises.push(promise);
          
          return promise;
        });
        
        // Wait for batch to complete before starting next batch
        await Promise.all(promises);
      }
      
      // Adjust scheduling interval based on workload
      if (this.config.adaptiveScheduling) {
        if (dueTasks.length > 0) {
          // If we had tasks to run, decrease interval for responsiveness
          this.currentInterval = this.config.minInterval;
        } else if (this.currentInterval < this.config.maxInterval) {
          // Gradually increase interval if no tasks to save resources
          this.currentInterval = Math.min(
            this.currentInterval + this.config.intervalStep,
            this.config.maxInterval
          );
        }
      }
    } catch (error) {
      console.warn('Error in task execution:', error);
    }
  }

  /**
   * Update scheduler configuration
   * @param {Object} newConfig New configuration parameters
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    
    // Restart app state monitoring if adaptive scheduling changed
    if (this.isRunning && this.config.adaptiveScheduling) {
      this.setupAppStateMonitoring();
    } else if (this.appStateListener && !this.config.adaptiveScheduling) {
      AppState.removeEventListener('change', this.appStateListener);
      this.appStateListener = null;
    }
    
    // Recalculate interval and reschedule
    if (this.isRunning) {
      this.currentInterval = this.calculateInterval();
      this.scheduleNextExecution();
    }
  }

  /**
   * Force immediate execution of due tasks
   */
  forceExecution() {
    if (!this.isRunning) return;
    
    // Clear existing timer
    if (this.schedulerTimer) {
      clearTimeout(this.schedulerTimer);
      this.schedulerTimer = null;
    }
    
    // Execute tasks immediately
    this.executeTasks().then(() => {
      this.scheduleNextExecution();
    }).catch(error => {
      console.warn('Error in forced execution:', error);
      this.scheduleNextExecution();
    });
  }

  /**
   * Get current scheduler status
   * @returns {Object} Current scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      currentInterval: this.currentInterval,
      pendingTasks: this.pendingPromises.length,
      idleTime: this.idleTime,
      appState: this.appState,
      config: { ...this.config }
    };
  }
}

// Create singleton instance
const taskScheduler = new TaskScheduler();

export default taskScheduler;