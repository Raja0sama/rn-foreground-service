package app.meets.ForegroundService.errors;

public final class PermissionNotGrantedError extends Throwable {
    public PermissionNotGrantedError(String permission) {
        super("Foreground service needs \"" + permission + "\" permission to be granted.");
    }
}
