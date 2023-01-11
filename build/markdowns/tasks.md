## `add_task`

Adds a new task to the task queue.

### Parameters

- `task`: function - A function or Promise that represents the task to be added to the queue.
- `options`: object - An object containing the following options:
  - `delay`: number - The delay in milliseconds between each execution of the task (default is `5000`).
  - `onLoop`: boolean - Whether the task should be executed repeatedly after the initial delay (default is `true`).
  - `taskId`: string - A unique ID for the task (default is a randomly generated string).
  - `onSuccess`: function - A function to be called when the task succeeds.
  - `onError`: function - A function to be called when the task fails.

### Returns

string - The ID of the added task.

## `update_task`

Updates an existing task in the task queue.

### Parameters

- `task`: function - A function or Promise that represents the updated task.
- `options`: object - An object containing the following options:
  - `delay`: number - The delay in milliseconds between each execution of the task (default is `5000`).
  - `onLoop`: boolean - Whether the task should be executed repeatedly after the initial delay (default is `true`).
  - `taskId`: string - The ID of the task to be updated.
  - `onSuccess`: function - A function to be called when the task succeeds.
  - `onError`: function - A function to be called when the task fails.

### Returns

string - The ID of the updated task.

## `remove_task`

Removes a task from the task queue.

### Parameters

- `taskId`: string - The ID of the task to be removed.

### Returns

void

## `is_task_running`

Checks if a task with the specified ID is currently in the task queue.

### Parameters

- `taskId`: string - The ID of the task to check for.

### Returns

boolean - `true` if the task is in the queue, `false` otherwise.

## `remove_all_tasks`

Removes all tasks from the task queue.

### Returns

void

## `get_task`

Gets the task with the specified ID from the task queue.

### Parameters

- `taskId`: string - The ID of the task to retrieve.

### Returns

object - An object representing the task, or `null` if no task with the specified ID was found.

## `get_all_tasks`

Gets all tasks currently in the task queue.

### Returns

object - An object containing all tasks in the queue, with task IDs as keys.
