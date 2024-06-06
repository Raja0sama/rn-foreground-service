package app.meets.ForegroundService.errors;

public final class UnableToStartServiceError extends Throwable {
    public UnableToStartServiceError() {
        super("Unable to start service.");
    }
}
