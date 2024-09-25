import ForegroundService from './ForegroundService';
import { randHashString } from './utils';
import { setupServiceErrorListener } from './eventListeners';

let tasks = {};
const samplingInterval = 500;
let serviceRunning = false;

const deleteTask = (taskId) => delete tasks[taskId];

const taskRunner = async () => {
  if (!serviceRunning) return;
  const now = Date.now();
  let promises = Object.entries(tasks).map(([taskId, task]) => {
    if (now >= task.nextExecutionTime) {
      if (task.onLoop) task.nextExecutionTime = now + task.delay;
      else deleteTask(taskId);
      return Promise.resolve(task.task()).then(task.onSuccess, task.onError);
    }
  });
  await Promise.all(promises);
};

export const register = ({
  config: { alert = true, onServiceErrorCallBack = console.log } = {},
} = {}) => {
  if (!serviceRunning) {
    setupServiceErrorListener({ alert, onServiceFailToStart: onServiceErrorCallBack });
    return ForegroundService.registerForegroundTask("myTaskName", taskRunner);
  }
};

export const start = async (config) => {
  try {
    if (!serviceRunning) {
      await ForegroundService.startService(config);
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

export const update = async (config) => {
  try {
    await ForegroundService.updateNotification(config);
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

export const stop = () => {
  serviceRunning = false;
  return ForegroundService.stopService();
};

export const stopAll = () => {
  serviceRunning = false;
  return ForegroundService.stopServiceAll();
};

export const is_running = () => serviceRunning;

export const add_task = (task, config) => {
  const { delay = 5000, onLoop = true, taskId = randHashString(12), onSuccess = () => {}, onError = () => {} } = config;
  if (typeof task !== "function") throw `invalid task of type ${typeof task}, expected a function or a Promise`;
  if (!tasks[taskId]) tasks[taskId] = { task, nextExecutionTime: Date.now(), delay: Math.ceil(delay / samplingInterval) * samplingInterval, onLoop, taskId, onSuccess, onError };
  return taskId;
};

export const update_task = (task, config) => {
  const { delay = 5000, onLoop = true, taskId = randHashString(12), onSuccess = () => {}, onError = () => {} } = config;
  if (typeof task !== "function") throw `invalid task of type ${typeof task}, expected a function or a Promise`;
  tasks[taskId] = { task, nextExecutionTime: Date.now(), delay: Math.ceil(delay / samplingInterval) * samplingInterval, onLoop, taskId, onSuccess, onError };
  return taskId;
};

export const remove_task = (taskId) => deleteTask(taskId);
export const is_task_running = (taskId) => !!tasks[taskId];
export const remove_all_tasks = () => (tasks = {});
export const get_task = (taskId) => tasks[taskId];
export const get_all_tasks = () => tasks;
export const eventListener = (callBack) => {
  let subscription = DeviceEventEmitter.addListener("notificationClickHandle", callBack);
  return () => subscription.remove();
};