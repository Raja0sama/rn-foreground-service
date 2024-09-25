import { NativeEventEmitter, NativeModules, Alert } from "react-native";
import { stop } from './tasks';

const ForegroundServiceModule = NativeModules.ForegroundService;
const eventEmitter = new NativeEventEmitter(ForegroundServiceModule);

export function setupServiceErrorListener({ onServiceFailToStart, alert }) {
  const listener = eventEmitter.addListener("onServiceError", (message) => {
    alert && Alert.alert("Service Error", message);
    if (onServiceFailToStart) onServiceFailToStart();
    stop();
  });
  return () => listener.remove();
}