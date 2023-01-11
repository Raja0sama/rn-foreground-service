# Notification API

Below is the notification API, that let you enable disable some of the functionality of the foreground service

## `start` \ `update`

Sends a notification with the specified options.

### Parameters

- `id`: number - Unique notification id.
- `title`: string - Notification title.
- `message`: string - Notification message.
- `number`: string - Int specified as string > 0, for devices that support it, this might be used to set the badge counter.
- `icon`: string - Small icon name (default is `ic_notification`).
- `largeIcon`: string - Large icon name (default is `ic_launcher`).
- `visibility`: string - Visibility of the notification (options are `private`, `public`, or `secret`).
- `ongoing`: boolean - Whether the notification is ongoing. The notification the service was started with will always be ongoing.
- `importance`: number - Importance (and priority for older devices) of this notification. This might affect notification sound (options are `none`, `min`, `low`, `default`, `high`, or `max`, with `default` being the default value).
- `button`: boolean - Whether to include a first button in the notification.
- `buttonText`: string - Text for the first button.
- `buttonOnPress`: string - Action to take when the first button is pressed.
- `button2`: boolean - Whether to include a second button in the notification.
- `button2Text`: string - Text for the second button.
- `button2OnPress`: string - Action to take when the second button is pressed.
- `mainOnPress`: string - Action to take when the main area of the notification is pressed.
- `setOnlyAlertOnce`: boolean - Whether the notification should only alert the user once (default is `false`).
- `color`: string - Color of the notification (in hex format, e.g. `#000000`).
- `progress`: object - Object containing progress information for the notification:
  - `max`: number - Maximum progress value.
  - `curr`: number - Current progress value.

### Returns

Promise<void> - A promise that resolves when the notification has been sent.

## `stop`

Stops the foreground service. Note: Pending tasks might still complete. If `startService` has been called multiple times, this needs to be called as many times.

### Returns

Promise - A promise that resolves when the service has been stopped.

## `stopAll`

Stops the foreground service. Note: Pending tasks might still complete. This will stop the service regardless of how many times `startService` was called.

### Returns

Promise - A promise that resolves when the service has been stopped.

## `eventListener`

Adds an event listener that listens for a `notificationClickHandle` event.

### Parameters

- `callBack`: function - A function to be called when the `notificationClickHandle` event is emitted.

### Returns

function - A function that removes the event listener when called.
