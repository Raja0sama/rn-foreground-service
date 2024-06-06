import { NativeModules } from "react-native";

const ForegroundServiceModule = NativeModules.ForegroundService;

export const ForegroundService = {
  start: ForegroundServiceModule.start,
  update: ForegroundServiceModule.update,
  stop: ForegroundServiceModule.stop
}

