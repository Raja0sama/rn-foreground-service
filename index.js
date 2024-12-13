import {
  NativeModules,
  AppRegistry,
  DeviceEventEmitter,
  NativeEventEmitter,
  Alert
} from 'react-native';
import { NotificationImportance, NotificationVisibility } from '.';

/**
 * @typedef {Object} IForegroundServiceModuleHandlers
 * @property {function(INotificationConfig): Promise<void>} startService - Starts a service with the provided notification configuration.
 * @property {function(INotificationConfig): Promise<void>} updateNotification - Updates an existing notification with the given configuration.
 * @property {function({id: number}): Promise<void>} cancelNotification - Cancels a notification using its unique ID.
 * @property {function(): Promise<void>} stopService - Stops the current service.
 * @property {function(): Promise<void>} stopServiceAll - Stops all running services.
 * @property {function(ITaskConfig): Promise<void>} runTask - Executes a task with the specified task configuration.
 * @property {function(): Promise<boolean>} isRunning - Checks if the service is currently running.
 */


// ANDROID ONLY
// Copied and adapted from https://github.com/voximplant/react-native-foreground-service
// and https://github.com/zo0r/react-native-push-notification/

/**
 * @type {import('react-native').NativeModule & IForegroundServiceModuleHandlers} TaskConfig
 */
const ForegroundServiceModule = NativeModules.ForegroundService;


/**
 * @typedef {Object} INotificationConfig
 * @property {number} id - Unique notification id
 * @property {string} title - Notification title
 * @property {string} message - Notification message
 * @property {string} ServiceType - Foreground service types are Mandatory in Android 14
 * @property {string} number - int specified as string > 0, for devices that support it, this might be used to set the badge counter
 * @property {string} icon - Small icon name | ic_notification
 * @property {string} largeIcon - Large icon name | ic_launcher
 * @property {NotificationVisibility} visibility - private | public | secret
 * @property {boolean} ongoing - true/false if the notification is ongoing. The notification the service was started with will always be ongoing
 * @property {NotificationImportance} [importance] - Importance (and priority for older devices) of this notification. This might affect notification sound One of:
 *                                                  none - IMPORTANCE_NONE (by default),
 *                                                  min - IMPORTANCE_MIN,
 *                                                  low - IMPORTANCE_LOW,
 *                                                  default - IMPORTANCE_DEFAULT
 *                                                  high - IMPORTANCE_HIGH,
 *                                                  max - IMPORTANCE_MAX
 * @property {boolean} [vibration] - Enable / Disable vibration.
 * @property {boolean} [button] - Show a primary button if needed.
 * @property {string} [buttonText] - Text for the primary button.
 * @property {string} [buttonOnPress] - Function name or callback identifier for the primary button action.
 * @property {boolean} [button2] - Show a secondary button is displayed.
 * @property {string} [button2Text] - Text for the secondary button.
 * @property {string} [button2OnPress] - Function name or callback identifier for the secondary button action.
 * @property {string} [mainOnPress] - Function name or callback identifier for the main notification click action.
 * @property {boolean} [progressBar] - Indicates if a progress bar should be shown.
 * @property {number} [progressBarMax] - Maximum value for the progress bar.
 * @property {number} [progressBarCurr] - Current value of the progress bar.
 * @property {string} [color] - Color to be used for the notification accent.
 * @property {string} [setOnlyAlertOnce] - If set, the notification will only alert once and not repeatedly for updates.
 */


/**
 * @typedef {Object} ITaskConfig
 * @property {string} taskName - Name of the JavaScript task configured with `registerForegroundTask`.
 * @property {number} delay - Start task after a delay, in milliseconds.
 * @property {number} loopDelay - Time delay between task executions in loop mode, in milliseconds.
 * @property {boolean} onLoop - Indicates whether the task should execute repeatedly in a loop.
 */

/**
 * @typedef {Object} ITask
 * @property {number} nextExecutionTime - Timestamp indicating the next scheduled execution time for the task, in milliseconds since the epoch.
 * @property {() => Promise<any>} task - The task handler function responsible for executing the task logic.
 * @property {function(): void} onSuccess - Callback executed when the task completes successfully.
 * @property {function(any): void} onError - Callback executed when the task encounters an error. Receives the error object as a parameter.
 * @property {boolean} onLoop - Indicates whether the task should run repeatedly in a loop.
 * @property {number} delay - Delay in milliseconds before the task starts or repeats.
 * @property {string} taskId - Unique identifier for the task.
 */

/**
 * @typedef {Object} IStartOptions
 * @property {string} id - Unique identifier for the notification.
 * @property {string} [title] - Title of the notification.
 * @property {string} [message] - Message body of the notification.
 * @property {string} ServiceType - Type of service. Mandatory in Android 14.
 * @property {boolean} [vibration] - Specifies whether the notification should trigger vibration.
 * @property {NotificationVisibility} [visibility] - Visibility of the notification. Options: "private", "public", or "secret".
 * @property {string} [icon] - Name of the small icon for the notification.
 * @property {string} [largeIcon] - Name of the large icon for the notification.
 * @property {NotificationImportance} [importance] - Importance level of the notification. Options: "none", "min", "low", "default", "high", "max".
 * @property {string} [number] - String representation of a number, used for badge counters on supporting devices.
 * @property {boolean} [button] - Indicates if a primary button is displayed on the notification.
 * @property {string} [buttonText] - Text label for the primary button.
 * @property {'buttonOnPress'} [buttonOnPress] - Identifier or action for the primary button press.
 * @property {boolean} [button2] - Indicates if a secondary button is displayed on the notification.
 * @property {string} [button2Text] - Text label for the secondary button.
 * @property {'button2OnPress'} [button2OnPress] - Identifier or action for the secondary button press.
 * @property {'mainOnPress'} [mainOnPress] - Identifier or action for the main notification click event.
 * @property {Object} [progress] - Progress bar configuration.
 * @property {number} progress.max - Maximum value of the progress bar.
 * @property {number} progress.curr - Current value of the progress bar.
 * @property {string} [color] - Accent color for the notification.
 * @property {string} [setOnlyAlertOnce] - If set, the notification will alert only once and not repeatedly for updates.
 */

class ForegroundService {
  /**
   * Registers a piece of JS code to be ran on the service
   * NOTE: This must be called before anything else, or the service will fail.
   * NOTE2: Registration must also happen at module level (not at mount)
   * task will receive all parameters from runTask
   * @param {task} async function to be called
   */
  static registerForegroundTask(taskName, task) {
    AppRegistry.registerHeadlessTask(taskName, () => task);
  }

  /**
   * Start foreground service
   * Multiple calls won't start multiple instances of the service, but will increase its internal counter
   * so calls to stop won't stop until it reaches 0.
   * Note: notificationConfig can't be re-used (becomes immutable)
   * @param {INotificationConfig} notificationConfig - Notification config
   * @return Promise
   */
  static async startService(notificationConfig) {
    console.log('Start Service Triggered');
    return await ForegroundServiceModule.startService(notificationConfig);
  }

  /**
   * Updates a notification of a running service. Make sure to use the same ID
   * or it will trigger a separate notification.
   * Note: this method might fail if called right after starting the service
   * since the service might not be yet ready.
   * If service is not running, it will be started automatically like calling startService.
   * @param {INotificationConfig} notificationConfig - Notification config
   * @return Promise
   */
  static async updateNotification(notificationConfig) {
    console.log(' Update Service Triggered');
    return await ForegroundServiceModule.updateNotification(notificationConfig);
  }

  /**
   * Cancels/dimisses a notification given its id. Useful if the service used
   * more than one notification
   * @param {number} id - Notification id to cancel
   * @return Promise
   */
  static async cancelNotification(id) {
    console.log('Cancel Service Triggered');
    return await ForegroundServiceModule.cancelNotification({id: id});
  }

  /**
   * Stop foreground service. Note: Pending tasks might still complete.
   * If startService will called multiple times, this needs to be called as many times.
   * @return Promise
   */
  static async stopService() {
    console.log('Stop Service Triggered');
    return await ForegroundServiceModule.stopService();
  }

  /**
   * Stop foreground service. Note: Pending tasks might still complete.
   * This will stop the service regardless of how many times start was called
   * @return Promise
   */
  static async stopServiceAll() {
    return await ForegroundServiceModule.stopServiceAll();
  }

  /**
   * Runs a previously configured headless task.
   * Task must be able to self stop if the service is stopped, since it can't be force killed once started.
   * Note: This method might silently fail if the service is not running, but will run successfully
   * if the service is still spinning up.
   * If the service is not running because it was killed, it will be attempted to be started again
   * using the last notification available.
   * @param {ITaskConfig} taskConfig - Notification config
   * @return Promise
   */
  static async runTask(taskConfig) {
    return await ForegroundServiceModule.runTask(taskConfig);
  }

  /**
   * Returns an integer indicating if the service is running or not.
   * The integer represents the internal counter of how many startService
   * calls were done without calling stopService
   * @return Promise
   */
  static async isRunning() {
    return await ForegroundServiceModule.isRunning();
  }
}

const randHashString = len => {
  return 'x'.repeat(len).replace(/[xy]/g, c => {
    let r = (Math.random() * 16) | 0,
      v = c == 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// =========== > initial state <==========
/**
 * @type {{[taskId: string]: ITask}}
 */
let tasks = {};
const samplingInterval = 500; //ms
let serviceRunning = false;

const deleteTask = taskId => {
  delete tasks[taskId];
};

const taskRunner = async () => {
  try {
    if (!serviceRunning) return;

    const now = Date.now();
    let promises = [];

    //iterate over all tasks
    Object.entries(tasks).forEach(([taskId, task]) => {
      //check if this task's execution time has arrived
      if (now >= task.nextExecutionTime) {
        //push this task's promise for later execution
        promises.push(
          Promise.resolve(task.task()).then(task.onSuccess, task.onError),
        );
        //if this is a looped task then increment its nextExecutionTime by delay for the next interval
        if (task.onLoop) task.nextExecutionTime = now + task.delay;
        //else delete the one-off task
        else deleteTask(taskId);
      }
    });

    //execute all tasks promises in parallel
    await Promise.all(promises);
  } catch (error) {
    console.log('Error in FgService taskRunner:', error);
  }
};
/**
 * Registers a foreground task 
 * @param {Object} param - The configuration object for registration.
 * @param {Object} param.config - Configuration details for the registration process.
 * @param {boolean} param.config.alert - Indicates whether alerts should be enabled for the service.
 * @param {function(): void} param.config.onServiceErrorCallBack - Callback function invoked when a service error occurs.
 */
const register = ({config: {alert, onServiceErrorCallBack}}) => {
  if (!serviceRunning) {
    setupServiceErrorListener({
      alert,
      onServiceFailToStart: onServiceErrorCallBack,
    });
    
    return ForegroundService.registerForegroundTask('myTaskName', taskRunner);
  }
};

/**
 * start the foreground service
 * @param {IStartOptions} param0 
 */
const start = async ({
  id,
  title = id,
  message = 'Foreground Service Running...',
  ServiceType,
  vibration = false,
  visibility = NotificationVisibility.PUBLIC,
  icon = 'ic_notification',
  largeIcon = 'ic_launcher',
  importance = NotificationImportance.MAX,
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
  setOnlyAlertOnce,
}) => {
  try {
    if (!serviceRunning) {
      await ForegroundService.startService({
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
        setOnlyAlertOnce,
      });
      serviceRunning = true;
      await ForegroundService.runTask({
        taskName: 'myTaskName',
        delay: samplingInterval,
        loopDelay: samplingInterval,
        onLoop: true,
      });
    } else console.log('Foreground service is already running.');
  } catch (error) {
    throw error;
  }
};


/**
 * update the foreground service
 * @param {IStartOptions} param0 
 */
const update = async ({
  id,
  title = id,
  message = 'Foreground Service Running...',
  ServiceType,
  vibration = false,
  visibility = NotificationVisibility.PUBLIC,
  largeIcon = 'ic_launcher',
  icon = 'ic_launcher',
  importance = NotificationImportance.MAX,
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
  setOnlyAlertOnce,
}) => {
  try {
    await ForegroundService.updateNotification({
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
      setOnlyAlertOnce,
      color,
    });
    if (!serviceRunning) {
      serviceRunning = true;
      await ForegroundService.runTask({
        taskName: 'myTaskName',
        delay: samplingInterval,
        loopDelay: samplingInterval,
        onLoop: true,
      });
    }
  } catch (error) {
    throw error;
  }
};

/**
 * handler to reset tasks next execution time to now when the service is stopped
 * @param {string} taskId 
 */
const reset_tasks_next_execution_time = (taskId) => {
  const now = Date.now();

  for (const [id, task] of Object.entries(tasks)) {
    if (taskId && taskId === id) {
      // reset just the targetTask
      task.nextExecutionTime = now;
    } else if (!taskId) {
      // reset all tasks
      task.nextExecutionTime = now;
    }
  }
};

/**
 * handler to pause the service without resetting tasks next execution time
 */
const pause = () => {
  serviceRunning = false;
  return ForegroundService.stopService();
};

/**
 * stop the service and optionally stop reset tasks next execution time if needed and also stop the task by taskId if provided
 * @param {boolean} resetTaskNextExecutionTime 
 * @param {string} taskId 
 */
const stop = (resetTaskNextExecutionTime = true, taskId) => {
  if (resetTaskNextExecutionTime) {
    reset_tasks_next_execution_time(taskId);
  }

  serviceRunning = false;
  return ForegroundService.stopService();
};

/**
 * stop all services and reset tasks next execution time to now for immediate run tasks when start again
 */
const stopAll = () => {
  reset_tasks_next_execution_time();
  serviceRunning = false;
  return ForegroundService.stopServiceAll();
};

const is_running = () => serviceRunning;

const add_task = (
  task,
  {
    delay = 5000,
    onLoop = true,
    taskId = randHashString(12),
    onSuccess = () => {},
    onError = () => {},
  },
) => {
  const _type = typeof task;
  if (_type !== 'function')
    throw `invalid task of type ${_type}, expected a function or a Promise`;

  if (!tasks[taskId])
    tasks[taskId] = {
      task,
      nextExecutionTime: Date.now(),
      delay: Math.ceil(delay / samplingInterval) * samplingInterval,
      onLoop: onLoop,
      taskId,
      onSuccess,
      onError,
    };

  return taskId;
};

const update_task = (
  task,
  {
    delay = 5000,
    onLoop = true,
    taskId = randHashString(12),
    onSuccess = () => {},
    onError = () => {},
  },
) => {
  const _type = typeof task;
  if (_type !== 'function')
    throw `invalid task of type ${_type}, expected a function or a Promise`;

  tasks[taskId] = {
    task,
    nextExecutionTime: Date.now(),
    delay: Math.ceil(delay / samplingInterval) * samplingInterval,
    onLoop: onLoop,
    taskId,
    onSuccess,
    onError,
  };

  return taskId;
};

const remove_task = taskId => deleteTask(taskId);

const is_task_running = taskId => (tasks[taskId] ? true : false);

const remove_all_tasks = () => (tasks = {});

const get_task = taskId => tasks[taskId];

const get_all_tasks = () => tasks;

const eventListener = callBack => {
  let subscription = DeviceEventEmitter.addListener(
    'notificationClickHandle',
    callBack,
  );

  return function cleanup() {
    subscription.remove();
  };
};

const eventEmitter = new NativeEventEmitter(ForegroundServiceModule);
export function setupServiceErrorListener({onServiceFailToStart, alert}) {
  const listener = eventEmitter.addListener('onServiceError', message => {
    alert && Alert.alert('Service Error', message);
    if (onServiceFailToStart) {
      onServiceFailToStart();
    }
    pause();
  });

  return () => {
    listener.remove();
  };
}

const ReactNativeForegroundService = {
  register,
  start,
  update,
  pause,
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
};

export default ReactNativeForegroundService;
