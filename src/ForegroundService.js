import { NativeModules, AppRegistry } from "react-native";

const ForegroundServiceModule = NativeModules.ForegroundService;

class ForegroundService {
  static registerForegroundTask(taskName, task) {
    AppRegistry.registerHeadlessTask(taskName, () => task);
  }

  static async startService(notificationConfig) {
    console.log("Start Service Triggered");
    return await ForegroundServiceModule.startService(notificationConfig);
  }

  static async updateNotification(notificationConfig) {
    console.log("Update Service Triggered");
    return await ForegroundServiceModule.updateNotification(notificationConfig);
  }

  static async cancelNotification(id) {
    console.log("Cancel Service Triggered");
    return await ForegroundServiceModule.cancelNotification({ id });
  }

  static async stopService() {
    console.log("Stop Service Triggered");
    return await ForegroundServiceModule.stopService();
  }

  static async stopServiceAll() {
    return await ForegroundServiceModule.stopServiceAll();
  }

  static async runTask(taskConfig) {
    return await ForegroundServiceModule.runTask(taskConfig);
  }

  static async isRunning() {
    return await ForegroundServiceModule.isRunning();
  }
}

export default ForegroundService;