# Getting Started

After Installing and linking the application, the rest of the procedure is pretty stragihtforward. You need register a headless task and and create a foreground service.

### Step 1 :

In your root, Index.js file. Paste the following code.

```javascript
import ReactNativeForegroundService from "@supersami/rn-foreground-service";
ReactNativeForegroundService.register();
```

The above code will register a initial headless task, which will be a first layer, over which, you can add as many task as you desire and they all will execute seamlessly.

### Step 2 :

Create a task and add it the execution queue. anywhere in your application, you can create a task like this.

```javascript
ReactNativeForegroundService.add_task(() => update(), {
  delay: 1000,
  onLoop: true,
  taskId: "taskid",
  onError: (e) => console.log(`Error logging:`, e),
});
```

### Step 3 :

Creating a foreground service, so that your headless task stays active.

```javascript
ReactNativeForegroundService.start({
  id: 1244,
  title: "Foreground Service",
  message: "We are live World",
  icon: "ic_launcher",
  button: true,
  button2: true,
  buttonText: "Button",
  button2Text: "Anther Button",
  buttonOnPress: "cray",
  setOnlyAlertOnce: true,
  color: "#000000",
  progress: {
    max: 100,
    curr: 50,
  },
});
```
