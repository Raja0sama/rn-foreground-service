export enum NotificationImportance {
  NONE = 'none',
  MIN = 'min',
  LOW = 'low',
  DEFAULT = 'default',
  HIGH = 'high',
  MAX = 'max',
}

export enum NotificationVisibility {
  PRIVATE = 'private',
  PUBLIC = 'public',
  SECRET = 'secret',
}

type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};


type INotificationConfig = {
  id: number;
  title: string;
  message: string;
  ServiceType: string;
  number: string;
  icon: string;
  largeIcon: string;
  visibility: NotificationVisibility;
  ongoing: boolean;
  importance?: NotificationImportance;

  vibration?: boolean;
  button?: boolean | undefined;
  buttonText?: string | undefined;
  buttonOnPress?: string | undefined;
  button2?: boolean | undefined;
  button2Text?: string | undefined;
  button2OnPress?: string | undefined;
  mainOnPress?: string | undefined;
  progressBar?: boolean | undefined;
  progressBarMax: number | undefined;
  progressBarCurr: number | undefined;
  color?: string;
  setOnlyAlertOnce?: string;
}


type ITaskConfig = {
  taskName: string;
  delay: number;
  loopDelay: number;
  onLoop: boolean;
}

type ITask = {
  nextExecutionTime: number;
  task: () => Promise<any>;
  onSuccess: () => void;
  onError: (e: any) => void;
  onLoop: boolean;
  delay: number;
  taskId: string;
}

type IRegisterConfig = {
  config: {
    alert: boolean;
    onServiceErrorCallBack: () => void;
  };
};

type IStartOptions = {
  id: any;
  title?: any;
  message?: string | undefined;
  ServiceType: string;
  vibration?: boolean | undefined;
  visibility?: NotificationVisibility;
  icon?: string | undefined;
  largeIcon?: string | undefined;
  importance?: NotificationImportance;
  number?: string | undefined;
  button?: boolean | undefined;
  buttonText?: string | undefined;
  buttonOnPress?: 'buttonOnPress' | undefined;
  button2?: boolean | undefined;
  button2Text?: string | undefined;
  button2OnPress?: 'button2OnPress' | undefined;
  mainOnPress?: 'mainOnPress' | undefined;
  progress?: {
    max: number;
    curr: number;
  };
  color?: string;
  setOnlyAlertOnce?: string;
};

type IForegroundServiceModuleHandlers = {
  startService: (options: INotificationConfig) => Promise<void>;
  updateNotification: (options: INotificationConfig) => Promise<void>;
  cancelNotification: (options: { id: number }) => Promise<void>;
  stopService: () => Promise<void>;
  stopServiceAll: () => Promise<void>;
  runTask: (taskConfig: ITaskConfig) => Promise<void>;
  isRunning: () => Promise<boolean>;
}

declare const ReactNativeForegroundService: {
  register: (options: IRegisterConfig) => void;
  start: (options: IStartOptions) => Promise<void>;
  update: (options: IStartOptions) => Promise<void>;
  pause: () => Promise<any>;
  stop: (resetTaskNextExecutionTime?: boolean | null | undefined, taskId?: string) => Promise<any>;
  stopAll: () => Promise<any>;
  is_running: () => boolean;
  add_task: (task: ITask['task'], taskOptions: Prettify<Partial<Omit<ITask, 'nextExecutionTime' | 'task'>>>) => string;
  update_task: (task: ITask['task'], taskOptions: Prettify<Partial<Omit<ITask, 'nextExecutionTime' | 'task'>>>) => string;
  remove_task: (taskId: string) => void;
  is_task_running: (taskId: string) => boolean;
  remove_all_tasks: () => {};
  get_task: (taskId: string) => ITask | undefined;
  get_all_tasks: () => { [taskId: string]: ITask };
  eventListener: (callBack: () => any) => () => void;
};

export default ReactNativeForegroundService;
