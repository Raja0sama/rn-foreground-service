import { NativeModules, AppRegistry, DeviceEventEmitter } from "react-native";

// ANDROID ONLY
// Copied and adapted from https://github.com/voximplant/react-native-foreground-service
// and https://github.com/zo0r/react-native-push-notification/

const ForegroundServiceModule = NativeModules.ForegroundService;

/**
 * @property {number} id - Unique notification id
 * @property {string} title - Notification title
 * @property {string} message - Notification message
 * @property {string} number - int specified as string > 0, for devices that support it, this might be used to set the badge counter
 * @property {string} icon - Small icon name | ic_notification
 * @property {string} largeIcon - Large icon name | ic_launcher
 * @property {string} visibility - private | public | secret
 * @property {boolean} ongoing - true/false if the notification is ongoing. The notification the service was started with will always be ongoing
 * @property {number} [importance] - Importance (and priority for older devices) of this notification. This might affect notification sound One of:
 *                                  none - IMPORTANCE_NONE (by default),
 *                               min - IMPORTANCE_MIN,
 *                               low - IMPORTANCE_LOW,
 *                               default - IMPORTANCE_DEFAULT
 *                               high - IMPORTANCE_HIGH,
 *                               max - IMPORTANCE_MAX
 */
const NotificationConfig = {};

/**
 * @property {string} taskName - name of the js task configured with registerForegroundTask
 * @property {number} delay - start task in delay miliseconds, use 0 to start immediately
 * ... any other values passed to the task as well
 */
const TaskConfig = {};

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
   * @param {NotificationConfig} notificationConfig - Notification config
   * @return Promise
   */
  static async startService(notificationConfig) {
    console.log("Start Service Triggered");
    // return await ForegroundServiceModule.startService(notificationConfig);
    return await ForegroundServiceModule.startForeground(notificationConfig);

  }

  /**
   * Updates a notification of a running service. Make sure to use the same ID
   * or it will trigger a separate notification.
   * Note: this method might fail if called right after starting the service
   * since the service might not be yet ready.
   * If service is not running, it will be started automatically like calling startService.
   * @param {NotificationConfig} notificationConfig - Notification config
   * @return Promise
   */
  static async updateNotification(notificationConfig) {
    console.log(" Update Service Triggered");
    return await ForegroundServiceModule.updateNotification(notificationConfig);
  }

  /**
   * Cancels/dimisses a notification given its id. Useful if the service used
   * more than one notification
   * @param {number} id - Notification id to cancel
   * @return Promise
   */
  static async cancelNotification(id) {
    console.log("Cancel Service Triggered");
    return await ForegroundServiceModule.cancelNotification({ id: id });
  }

  /**
   * Stop foreground service. Note: Pending tasks might still complete.
   * If startService will called multiple times, this needs to be called as many times.
   * @return Promise
   */
  static async stopService() {
    console.log("Stop Service Triggered");
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
   * @param {TaskConfig} taskConfig - Notification config
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

const randHashString = (len) => {
  return "x".repeat(len).replace(/[xy]/g, (c) => {
    let r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

//initial state
let tasks = {};
const samplingInterval = 500; //ms
let serviceRunning = false;

const deleteTask = (taskId) => {
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
          Promise.resolve(task.task()).then(task.onSuccess, task.onError)
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
    console.log("Error in FgService taskRunner:", error);
  }
};

const register = () => {
  if (!serviceRunning)
    return ForegroundService.registerForegroundTask("myTaskName", taskRunner);
};

const start = async ({
  id,
  title = id,
  message = "Foreground Service Running...",
  vibration = false,
  visibility = "public",
  icon = "ic_notification",
  largeIcon = "ic_launcher",
  importance = "max",
  number = "1",
  button = false,
  buttonText = "",
  buttonOnPress = "buttonOnPress",
  button2 = false,
  button2Text = "",
  button2OnPress = "button2OnPress",
  mainOnPress = "mainOnPress",
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
        taskName: "myTaskName",
        delay: samplingInterval,
        loopDelay: samplingInterval,
        onLoop: true,
      });
    } else console.log("Foreground service is already running.");
  } catch (error) {
    throw error;
  }
};

const update = async ({
  id,
  title = id,
  message = "Foreground Service Running...",
  vibration = false,
  visibility = "public",
  largeIcon = "ic_launcher",
  icon = "ic_launcher",
  importance = "max",
  number = "0",
  button = false,
  buttonText = "",
  buttonOnPress = "buttonOnPress",
  button2 = false,
  button2Text = "",
  button2OnPress = "button2OnPress",
  mainOnPress = "mainOnPress",
  progress,
  color,
  setOnlyAlertOnce,
}) => {
  try {
    await ForegroundService.updateNotification({
      id,
      title,
      message,
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
        taskName: "myTaskName",
        delay: samplingInterval,
        loopDelay: samplingInterval,
        onLoop: true,
      });
    }
  } catch (error) {
    throw error;
  }
};

const stop = () => {
  serviceRunning = false;
  return ForegroundService.stopService();
};
const stopAll = () => {
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
  }
) => {
  const _type = typeof task;
  if (_type !== "function")
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
  }
) => {
  const _type = typeof task;
  if (_type !== "function")
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

const remove_task = (taskId) => deleteTask(taskId);

const is_task_running = (taskId) => (tasks[taskId] ? true : false);

const remove_all_tasks = () => (tasks = {});

const get_task = (taskId) => tasks[taskId];

const get_all_tasks = () => tasks;

const eventListener = (callBack) => {
  let subscription = DeviceEventEmitter.addListener(
    "notificationClickHandle",
    callBack
  );

  return function cleanup() {
    subscription.remove();
  };
};

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
};

export default ReactNativeForegroundService;
