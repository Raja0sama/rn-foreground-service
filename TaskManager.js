import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const STORAGE_KEYS = {
  TASKS: '@ForegroundService:tasks',
  SERVICE_CONFIG: '@ForegroundService:serviceConfig',
  SERVICE_RUNNING: '@ForegroundService:serviceRunning',
};

// Default timeout for tasks (15 seconds)
const DEFAULT_TASK_TIMEOUT = 15000;

class TaskManager {
  constructor() {
    this.tasks = {};
    this.isInitialized = false;
    this.lastTaskId = 0;
    this.serviceRunning = false;
    this.serviceConfig = null;
    this.taskTimeouts = {};
    this.listeners = {};
  }

  /**
   * Initialize the task manager and restore saved state
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      if (Platform.OS !== 'android') {
        this.isInitialized = true;
        return;
      }

      // Restore saved tasks
      const tasksJson = await AsyncStorage.getItem(STORAGE_KEYS.TASKS);
      if (tasksJson) {
        const storedTasks = JSON.parse(tasksJson);
        
        // Restore task metadata, but not the actual functions
        // Functions will be re-registered by the app
        this.tasks = Object.fromEntries(
          Object.entries(storedTasks).map(([taskId, task]) => {
            return [taskId, { 
              ...task, 
              task: null,
              onSuccess: null,
              onError: null,
              isPaused: true,
              nextExecutionTime: Date.now() + (task.delay || 0)
            }];
          })
        );
      }

      // Restore service running state
      const serviceRunningStr = await AsyncStorage.getItem(STORAGE_KEYS.SERVICE_RUNNING);
      if (serviceRunningStr) {
        this.serviceRunning = JSON.parse(serviceRunningStr);
      }

      // Restore service configuration
      const serviceConfigJson = await AsyncStorage.getItem(STORAGE_KEYS.SERVICE_CONFIG);
      if (serviceConfigJson) {
        this.serviceConfig = JSON.parse(serviceConfigJson);
      }

      this.isInitialized = true;
      this.emitEvent('initialized', { restored: !!tasksJson });
    } catch (error) {
      console.warn('Failed to initialize task manager:', error);
      // Continue with empty state if restoration fails
      this.isInitialized = true;
      this.emitEvent('error', { 
        type: 'initialization_error', 
        error: error?.message || 'Unknown error during initialization'
      });
    }
  }

  /**
   * Save the current state to persistent storage
   * @returns {Promise<void>}
   */
  async saveState() {
    if (Platform.OS !== 'android') return;
    
    try {
      // Save tasks (without functions, which can't be serialized)
      const tasksToSave = Object.fromEntries(
        Object.entries(this.tasks).map(([taskId, task]) => {
          // Only save necessary properties for restoration
          const { task: _, onSuccess: __, onError: ___, isPaused, ...serializableTask } = task;
          return [taskId, serializableTask];
        })
      );
      
      await AsyncStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasksToSave));
      
      // Save service state
      await AsyncStorage.setItem(STORAGE_KEYS.SERVICE_RUNNING, JSON.stringify(this.serviceRunning));
      
      // Save service configuration if available
      if (this.serviceConfig) {
        await AsyncStorage.setItem(STORAGE_KEYS.SERVICE_CONFIG, JSON.stringify(this.serviceConfig));
      }
    } catch (error) {
      console.warn('Failed to save task manager state:', error);
      this.emitEvent('error', { 
        type: 'state_save_error', 
        error: error?.message || 'Unknown error saving state' 
      });
    }
  }

  /**
   * Generate a unique task ID
   * @returns {string} A unique task ID
   */
  generateTaskId() {
    this.lastTaskId++;
    return `task_${Date.now()}_${this.lastTaskId}`;
  }

  /**
   * Add or update a task
   * @param {Function} taskFn The task function to execute
   * @param {Object} options Task configuration options
   * @returns {string} The task ID
   */
  addTask(taskFn, options = {}) {
    if (!this.isInitialized) {
      throw new Error('TaskManager not initialized. Call initialize() first.');
    }
    
    if (typeof taskFn !== 'function') {
      throw new Error('Task must be a function');
    }
    
    const {
      taskId = this.generateTaskId(),
      delay = 0,
      onLoop = false,
      loopDelay = 5000,
      onSuccess = null,
      onError = null,
      timeout = DEFAULT_TASK_TIMEOUT,
      priority = 'normal',
      isPaused = false
    } = options;
    
    // Store task information
    this.tasks[taskId] = {
      task: taskFn,
      nextExecutionTime: Date.now() + delay,
      delay: Math.max(100, delay), // Minimum 100ms delay
      loopDelay: Math.max(100, loopDelay), // Minimum 100ms loop delay
      onLoop,
      onSuccess: typeof onSuccess === 'function' ? onSuccess : null,
      onError: typeof onError === 'function' ? onError : null,
      timeout,
      priority,
      isPaused,
      createdAt: Date.now(),
      lastExecutedAt: null,
      executionCount: 0,
      failureCount: 0
    };
    
    // Save state to persistent storage
    this.saveState();
    
    // Notify listeners
    this.emitEvent('taskAdded', { taskId });
    
    return taskId;
  }

  /**
   * Update an existing task
   * @param {string} taskId ID of the task to update
   * @param {Function} taskFn New task function
   * @param {Object} options New task options
   * @returns {boolean} True if task was found and updated
   */
  updateTask(taskId, taskFn, options = {}) {
    if (!this.tasks[taskId]) {
      return false;
    }
    
    if (typeof taskFn !== 'function') {
      throw new Error('Task must be a function');
    }
    
    const currentTask = this.tasks[taskId];
    
    this.tasks[taskId] = {
      ...currentTask,
      task: taskFn,
      nextExecutionTime: options.resetTimer 
        ? Date.now() + (options.delay || currentTask.delay) 
        : currentTask.nextExecutionTime,
      delay: options.delay !== undefined ? Math.max(100, options.delay) : currentTask.delay,
      loopDelay: options.loopDelay !== undefined ? Math.max(100, options.loopDelay) : currentTask.loopDelay,
      onLoop: options.onLoop !== undefined ? options.onLoop : currentTask.onLoop,
      onSuccess: options.onSuccess !== undefined 
        ? (typeof options.onSuccess === 'function' ? options.onSuccess : null) 
        : currentTask.onSuccess,
      onError: options.onError !== undefined 
        ? (typeof options.onError === 'function' ? options.onError : null) 
        : currentTask.onError,
      timeout: options.timeout !== undefined ? options.timeout : currentTask.timeout,
      priority: options.priority !== undefined ? options.priority : currentTask.priority,
      isPaused: options.isPaused !== undefined ? options.isPaused : currentTask.isPaused
    };
    
    // Save state to persistent storage
    this.saveState();
    
    // Notify listeners
    this.emitEvent('taskUpdated', { taskId });
    
    return true;
  }

  /**
   * Remove a task
   * @param {string} taskId ID of the task to remove
   * @returns {boolean} True if task was found and removed
   */
  removeTask(taskId) {
    if (!this.tasks[taskId]) {
      return false;
    }
    
    // Clear any pending timeout
    if (this.taskTimeouts[taskId]) {
      clearTimeout(this.taskTimeouts[taskId]);
      delete this.taskTimeouts[taskId];
    }
    
    // Remove the task
    delete this.tasks[taskId];
    
    // Save state to persistent storage
    this.saveState();
    
    // Notify listeners
    this.emitEvent('taskRemoved', { taskId });
    
    return true;
  }

  /**
   * Remove all tasks
   */
  removeAllTasks() {
    // Clear all pending timeouts
    Object.keys(this.taskTimeouts).forEach(taskId => {
      clearTimeout(this.taskTimeouts[taskId]);
    });
    
    this.taskTimeouts = {};
    this.tasks = {};
    
    // Save state to persistent storage
    this.saveState();
    
    // Notify listeners
    this.emitEvent('allTasksRemoved');
  }

  /**
   * Pause a task
   * @param {string} taskId ID of the task to pause
   * @returns {boolean} True if task was found and paused
   */
  pauseTask(taskId) {
    if (!this.tasks[taskId]) {
      return false;
    }
    
    this.tasks[taskId].isPaused = true;
    
    // Clear any pending timeout
    if (this.taskTimeouts[taskId]) {
      clearTimeout(this.taskTimeouts[taskId]);
      delete this.taskTimeouts[taskId];
    }
    
    // Save state to persistent storage
    this.saveState();
    
    // Notify listeners
    this.emitEvent('taskPaused', { taskId });
    
    return true;
  }

  /**
   * Resume a paused task
   * @param {string} taskId ID of the task to resume
   * @returns {boolean} True if task was found and resumed
   */
  resumeTask(taskId) {
    if (!this.tasks[taskId]) {
      return false;
    }
    
    // Only change state if it was paused
    if (this.tasks[taskId].isPaused) {
      this.tasks[taskId].isPaused = false;
      this.tasks[taskId].nextExecutionTime = Date.now() + this.tasks[taskId].delay;
      
      // Save state to persistent storage
      this.saveState();
      
      // Notify listeners
      this.emitEvent('taskResumed', { taskId });
    }
    
    return true;
  }

  /**
   * Execute tasks that are due to run
   * @returns {Promise<void>}
   */
  async executeDueTasks() {
    if (!this.serviceRunning) {
      return;
    }
    
    const now = Date.now();
    const taskIds = Object.keys(this.tasks);
    
    // Sort tasks by priority
    const sortedTaskIds = taskIds.sort((a, b) => {
      const priorityMap = { high: 0, normal: 1, low: 2 };
      return priorityMap[this.tasks[a].priority] - priorityMap[this.tasks[b].priority];
    });
    
    // Execute tasks that are due
    for (const taskId of sortedTaskIds) {
      const task = this.tasks[taskId];
      
      // Skip paused tasks
      if (task.isPaused) {
        continue;
      }
      
      // Check if task is due to execute
      if (now >= task.nextExecutionTime) {
        // Execute task with timeout
        await this.executeTaskWithTimeout(taskId);
        
        // Update next execution time for looping tasks
        if (task.onLoop) {
          this.tasks[taskId].nextExecutionTime = Date.now() + task.loopDelay;
        } else {
          // Remove non-looping tasks after execution
          this.removeTask(taskId);
        }
      }
    }
  }

  /**
   * Execute a task with a timeout to prevent it from running too long
   * @param {string} taskId ID of the task to execute
   * @returns {Promise<any>} Result of the task execution
   */
  async executeTaskWithTimeout(taskId) {
    const task = this.tasks[taskId];
    if (!task || !task.task) {
      throw new Error(`Task ${taskId} not found or not registered`);
    }
    
    // Create a promise that rejects after timeout
    const timeoutPromise = new Promise((_, reject) => {
      this.taskTimeouts[taskId] = setTimeout(() => {
        delete this.taskTimeouts[taskId];
        reject(new Error(`Task ${taskId} timed out after ${task.timeout}ms`));
      }, task.timeout);
    });
    
    try {
      // Race the task execution against the timeout
      const taskPromise = Promise.resolve(task.task());
      const result = await Promise.race([taskPromise, timeoutPromise]);
      
      // Clear the timeout
      clearTimeout(this.taskTimeouts[taskId]);
      delete this.taskTimeouts[taskId];
      
      // Update task metadata
      this.tasks[taskId].lastExecutedAt = Date.now();
      this.tasks[taskId].executionCount++;
      
      // Call success callback if provided
      if (task.onSuccess) {
        task.onSuccess(result);
      }
      
      // Save updated task state
      this.saveState();
      
      // Notify listeners
      this.emitEvent('taskExecuted', { taskId, result });
      
      return result;
    } catch (error) {
      // Clear the timeout if it was the task that failed, not the timeout
      if (this.taskTimeouts[taskId]) {
        clearTimeout(this.taskTimeouts[taskId]);
        delete this.taskTimeouts[taskId];
      }
      
      // Update task metadata
      this.tasks[taskId].lastExecutedAt = Date.now();
      this.tasks[taskId].failureCount++;
      
      // Call error callback if provided
      if (task.onError) {
        task.onError(error);
      }
      
      // Save updated task state
      this.saveState();
      
      // Notify listeners
      this.emitEvent('taskError', { 
        taskId, 
        error: error?.message || 'Unknown error',
        fullError: error
      });
      
      throw error;
    }
  }

  /**
   * Set service running state
   * @param {boolean} isRunning Whether the service is running
   * @param {Object} serviceConfig Current service configuration
   */
  setServiceRunning(isRunning, serviceConfig = null) {
    this.serviceRunning = isRunning;
    
    if (serviceConfig) {
      this.serviceConfig = serviceConfig;
    }
    
    // Save state to persistent storage
    this.saveState();
    
    // Notify listeners
    this.emitEvent('serviceStateChanged', { isRunning, serviceConfig });
  }

  /**
   * Check if the service is running
   * @returns {boolean} True if the service is running
   */
  isServiceRunning() {
    return this.serviceRunning;
  }

  /**
   * Get the current service configuration
   * @returns {Object|null} Current service configuration or null if not set
   */
  getServiceConfig() {
    return this.serviceConfig;
  }

  /**
   * Get a task by ID
   * @param {string} taskId ID of the task to get
   * @returns {Object|null} Task information or null if not found
   */
  getTask(taskId) {
    const task = this.tasks[taskId];
    if (!task) {
      return null;
    }
    
    // Return copy without the function references
    const { task: _, onSuccess: __, onError: ___, ...taskInfo } = task;
    return { ...taskInfo, hasTaskFn: !!task.task };
  }

  /**
   * Get all tasks
   * @returns {Object} Object with task IDs as keys and task info as values
   */
  getAllTasks() {
    return Object.fromEntries(
      Object.entries(this.tasks).map(([taskId, task]) => {
        // Return copies without the function references
        const { task: _, onSuccess: __, onError: ___, ...taskInfo } = task;
        return [taskId, { ...taskInfo, hasTaskFn: !!task.task }];
      })
    );
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
   * Remove all event listeners
   */
  removeAllEventListeners() {
    this.listeners = {};
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
}

// Create singleton instance
const taskManager = new TaskManager();

export default taskManager;