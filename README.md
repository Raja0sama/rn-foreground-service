# @supersami/rn-foreground-service 🤟

> A foreground service with headless task that can manage multiple headless tasks execution at the same time and handle interactions. 🎉

![react-browser-tab](https://miro.medium.com/max/1728/1*5ktY8XkS5a5iM6LsLOP7jw.png)
[DEMO](https://react-browser-tabs.vercel.app/)

### When to use this ?

If you want a foreground service in react native, RN-foreground-service is the way to go. This plugin handels Headless task, multiple task, notification customization, and notification interactions. 

[![NPM](https://img.shields.io/npm/v/@supersami/rn-foreground-service.svg)](https://www.npmjs.com/package/@supersami/rn-foreground-service) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

## Install

```bash
npm i @supersami/rn-foreground-service
```

## Usage


### Register a Headless Task

```js
import ReactNativeForegroundService from '@supersami/rn-foreground-service';
ReactNativeForegroundService.register();
AppRegistry.registerComponent(appName, () => App);
```

### Add a Task

```js
ReactNativeForegroundService.add_task(
      () => console.log('I am Being Tested'),
      {
        delay: 100,
        onLoop: true,
        taskId: 'taskid',
        onError: (e) => console.log(`Error logging:`, e),
      },
    )
```

## Starting Foreground service

```js
ReactNativeForegroundService.start({
      id: 144,
      title: 'Foreground Service',
      message: 'you are online!',
    });
```

[You can learn more about Rn-foreground-service.](https://medium.com/javascript-in-plain-english/react-native-foreground-service-f7fc8e617fba)
## License

MIT © [rajaosama](https://github.com/rajaosama)

