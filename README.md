# @supersami/rn-foreground-service v2 🤟

### Change Log :
1 - Working and tested on React Native v0.69
2 - Less Configuration needed now, Automated most of the configuration to install the foreground service.
3 - AutoLinking now supported. 
4 - Typescript support added


![react-browser-tab](https://miro.medium.com/max/1728/1*5ktY8XkS5a5iM6LsLOP7jw.png)
[DEMO](https://github.com/Raja0sama/ForegroundSerivceExample)

### When to use this ?

If you want a foreground service in react native, RN-foreground-service is the way to go. This plugin handels Headless task, multiple task, notification customization, and notification interactions.

[![NPM](https://img.shields.io/npm/v/@supersami/rn-foreground-service.svg)](https://www.npmjs.com/package/@supersami/rn-foreground-service) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

## Install

```bash
npm i @supersami/rn-foreground-service
```

or

```bash
yarn add @supersami/rn-foreground-service
```

And Then Just run this command once 

```
node node_modules/@supersami/rn-foreground-service/postinstall.js
```

## Usage

### Register a Headless Task

index.js

```js
// Import the library
import ReactNativeForegroundService from "@supersami/rn-foreground-service";
import { AppRegistry } from "react-native";
import { name as appName } from "./app.json";
import App from "./src/App.tsx";

// Register the service
ReactNativeForegroundService.register();
AppRegistry.registerComponent(appName, () => App);
```

### Add a Task

```js
ReactNativeForegroundService.add_task(() => console.log("I am Being Tested"), {
  delay: 100,
  onLoop: true,
  taskId: "taskid",
  onError: (e) => console.log(`Error logging:`, e),
});
```

## Starting Foreground service

```js
ReactNativeForegroundService.start({
  id: 144,
  title: "Foreground Service",
  message: "you are online!",
});
```

[You can learn more about Rn-foreground-service.](https://medium.com/javascript-in-plain-english/react-native-foreground-service-f7fc8e617fba)

## License

MIT © [rajaosama](https://github.com/raja0sama)
