declare module "@themeetzapp/react-native-foreground-service" {

  type NotificationConfig = {
    notificationChannelId: string;
    notificationTitle: string;
    notificationMessage: string;
  }

  const ForegroundService: {
    start: (notificationConfig: NotificationConfig) => Promise<void>;
    update: (notificationConfig: NotificationConfig) => Promise<void>;
    stop: () => Promise<void>;
  }

}
