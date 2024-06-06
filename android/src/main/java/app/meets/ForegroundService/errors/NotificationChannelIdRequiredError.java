package app.meets.ForegroundService.errors;

public final class NotificationChannelIdRequiredError extends Throwable {
    public NotificationChannelIdRequiredError() {
        super("Notification channel id is required.");
    }
}
