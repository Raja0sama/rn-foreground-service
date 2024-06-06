package app.meets.ForegroundService.errors;

public class NotificationChannelNotFoundException extends Throwable {
    public NotificationChannelNotFoundException(String channelId) {
        super("Notification channel \"" + channelId + "\" not found.");
    }
}
