package app.meets.ForegroundService.errors;

public final class NotificationTitleRequiredError extends Throwable {
    public NotificationTitleRequiredError() {
        super("Notification title is required.");
    }
}
