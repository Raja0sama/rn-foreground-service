package app.meets.ForegroundService.errors;

public final class NotificationMessageRequiredError extends Throwable {
    public NotificationMessageRequiredError() {
        super("Notification message is required.");
    }
}
