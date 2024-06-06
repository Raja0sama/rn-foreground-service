package app.meets.ForegroundService.errors;

public final class UnableToStopServiceError extends Throwable {
    public UnableToStopServiceError() {
        super("Unable to stop service.");
    }
}
