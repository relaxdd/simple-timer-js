import DateFormat from './DateFormat.ts';

type ValidationOptions = Record<string, { nullable: boolean, validator: boolean[] }>

export interface SimpleTimerOptions {
  // Автозапуск таймера
  autoPlay?: boolean,
  // Время после которого таймер загорается красным
  few?: number | null,
  // Изначальное время
  seconds: number,
  // Цвет окраски таймера при атрибуте data-few=""
  fewColor?: string | null,
  // Можно выключить перекраску из JS и делать это самому через стили
  setFewColor?: boolean,
  // Параметр для отладки, после истечения времени таймер будет увеличиваться
  // В общем отпрыгивать от 00:00:00 и 00:15:00
  bounce?: boolean,
  // Включить/выключить редирект по истечению таймера
  redirect?: boolean,
  // Ссылка на которую нужно перенаправить пользователя
  redirectUrl?: string | null,
  // Сохранять состояние таймера в браузере
  saveStateInStorage?: boolean,
  // Отображать миллисекунды
  displayMilliseconds?: boolean,
  // Старайтесь не ставить 3, это может сказаться на производительности
  fractionDigits?: 0 | 1 | 2 | 3,
}

type SimpleTimerRequiredOptions =
  & Required<Omit<SimpleTimerOptions, 'fractionDigits'>>
  & { fractionDigits: 1 | 2 | 3 }

const enum TimerState {
  play = 'play',
  stop = 'stop',
  pause = 'pause',
}

type TimerStateTypes = keyof typeof TimerState;
type TimerEventTypes = TimerStateTypes | 'reset'

/*
 * История изменений:
 *
 * 1.0.0 Доработанный таймер с сохранением состояние в памяти браузера
 * 1.1.0 Добавил поддержку внешнего изменения состояния, pause, play, reset и stop
 */

/**
 * @version 1.1.0
 * @author awenn2015@gmail.com
 * @link https://relaxdd.github.io/
 * @lastUpdate 31 July 2025, 13:55 +04
 */
class SimpleTimer {
  private readonly tickMs: number;
  private readonly second = 1000;
  
  private timerNode: HTMLElement;
  private options: SimpleTimerRequiredOptions;
  private timerInterval: number;
  private timerSeconds: number;
  
  private timerState: TimerState;
  private initialized = false;
  private directionFlag = true;
  
  private config = {
    fewAttr: 'data-few',
    storageKey: 'la5yPNRGnSn7tnK',
  };
  
  private listeners: Record<TimerEventTypes, (() => void)[]> = {
    stop: [],
    play: [],
    pause: [],
    reset: [],
  };
  
  /**
   * @public
   * @param selector Селектор искомого элемента в который нужно внедрить таймер
   * @param options Функция, которая будет вызываться по истечении интервала
   */
  public constructor(selector: string, options: SimpleTimerOptions) {
    if (!selector) throw new Error('Invalid selector');
    
    const timerNode = document.querySelector<HTMLElement>(selector);
    if (!timerNode) throw new Error('Invalid timer node');
    
    this.timerSeconds = 0;
    this.timerInterval = 0;
    this.timerState = TimerState.stop;
    this.timerNode = timerNode;
    
    /*
     * ==============================
     */
    
    const defaultOptions: SimpleTimerRequiredOptions = {
      seconds: 900,
      few: null,
      fewColor: 'red',
      setFewColor: false,
      bounce: false,
      redirect: false,
      redirectUrl: null,
      saveStateInStorage: false,
      displayMilliseconds: false,
      fractionDigits: 1,
      autoPlay: true,
    };
    
    const mergedOptions: Required<SimpleTimerOptions> = { ...defaultOptions, ...options };
    
    if (mergedOptions.fractionDigits > 3) mergedOptions.fractionDigits = 3;
    if (mergedOptions.fractionDigits < 0) mergedOptions.fractionDigits = 1;
    if (mergedOptions.fractionDigits < 1) mergedOptions.displayMilliseconds = false;
    
    this.options = this.validateOptions(mergedOptions as SimpleTimerRequiredOptions);
    this.tickMs = !this.options.displayMilliseconds ? this.second : this.second / 10 ** this.options.fractionDigits;
    
    /*
     * ==============================
     */
    
    this.drawPlaceholder();
  }
  
  public getState() {
    return this.timerState;
  }
  
  /**
   * @public
   */
  public pause(): void {
    if ([TimerState.pause, TimerState.stop].includes(this.timerState)) {
      window.alert('Таймер уже был остановлен.');
      return;
    }
    
    clearTimeout(this.timerInterval);
    this.setStateAndNotifyListeners(TimerState.pause);
  }
  
  /**
   * @public
   */
  public play(): void {
    if (this.timerState !== TimerState.pause) {
      if (this.timerState !== TimerState.play) {
        window.alert('Невозможно восстановить таймер.');
      }
      
      return;
    }
    
    clearTimeout(this.timerInterval);
    
    this.playTimer();
    this.notifyListeners(TimerState.play);
  }
  
  /**
   * @public
   */
  public stop(): void {
    if (this.timerState === TimerState.stop) {
      window.alert('Таймер уже был остановлен.');
      return;
    }
    
    clearTimeout(this.timerInterval);
    this.timerSeconds = 0;
    
    this.drawTimer();
    this.setStateAndNotifyListeners(TimerState.stop);
  }
  
  /**
   * @public
   */
  public reset(): void {
    const { seconds, autoPlay } = this.options;
    
    clearTimeout(this.timerInterval);
    this.timerSeconds = seconds;
    
    if (!autoPlay) {
      this.drawTimer();
      this.setStateAndNotifyListeners(TimerState.pause);
    } else {
      this.playTimer();
      this.notifyListeners('reset');
    }
  }
  
  /**
   * @public
   */
  public initialize(): void {
    if (this.initialized) {
      throw new Error('Invalid initialization');
    }
    
    const {
      seconds,
      autoPlay,
      saveStateInStorage,
    } = this.options;
    
    this.timerSeconds = seconds;
    
    if (saveStateInStorage && 'localStorage' in window) {
      const prevTime = window.localStorage.getItem(this.config.storageKey);
      if (prevTime && +prevTime >= 0) this.timerSeconds = +prevTime;
    }
    
    if (!autoPlay) {
      this.drawTimer();
      this.setStateAndNotifyListeners(TimerState.pause);
    } else {
      this.playTimer();
      this.notifyListeners(TimerState.play);
    }
    
    this.initialized = true;
  }
  
  /*
   * ====================================
   */
  
  /**
   * @public
   * @param listener
   */
  public onStop(listener: () => void) {
    this.listeners.stop = [listener];
  }
  
  /**
   * @public
   * @param listener
   */
  public onPause(listener: () => void) {
    this.listeners.pause = [listener];
  }
  
  /**
   * @public
   * @param listener
   */
  public onPlay(listener: () => void) {
    this.listeners.play = [listener];
  }
  
  /**
   * @public
   * @param listener
   */
  public onReset(listener: () => void) {
    this.listeners.reset = [listener];
  }
  
  /**
   * @public
   * @param typeEvent
   * @param listener
   */
  public addEventListener(typeEvent: TimerEventTypes, listener: () => void) {
    this.listeners[typeEvent].push(listener);
  }
  
  /*
   * ====================================
   */
  
  /**
   * @param eventName
   * @private
   */
  private notifyListeners(eventName: TimerEventTypes) {
    for (const listener of this.listeners[eventName]) {
      listener();
    }
  }
  
  /**
   * @param newState
   * @private
   */
  private setStateAndNotifyListeners(newState: TimerState) {
    this.timerState = newState;
    this.notifyListeners(newState);
  }
  
  /**
   * @private
   */
  private playTimer(): void {
    this.drawTimer();
    if (!this.timerSeconds) return;
    
    this.timerState = TimerState.play;
    this.timerInterval = setInterval(this.intervalTick.bind(this), this.tickMs);
  }
  
  /**
   * @private
   */
  private intervalTick(): void {
    if (this.directionFlag) this.timerSeconds -= this.tickMs / this.second;
    else this.timerSeconds += this.tickMs / this.second;
    
    this.timerSeconds = +this.timerSeconds.toFixed(this.options.fractionDigits);
    this.drawTimer();
    
    /*
     * ===============================
     */
    
    if (!this.options.bounce && this.timerSeconds <= 0) {
      clearInterval(this.timerInterval);
      this.setStateAndNotifyListeners(TimerState.stop);
      
      if (this.options.redirect && this.options.redirectUrl) {
        setTimeout(() => {
          window.location.href = this.options.redirectUrl!;
        }, this.second);
      }
    }
    
    /*
     * ===============================
     */
    
    const isSecondsZero = this.timerSeconds === 0;
    const isSecondsOver = this.timerSeconds >= this.options.seconds;
    
    if (this.options.bounce && isSecondsZero || isSecondsOver) {
      this.directionFlag = !this.directionFlag;
    }
  }
  
  /**
   * @private
   */
  private formatTime(seconds: number) {
    return DateFormat.formatTime(seconds, this.options.displayMilliseconds, this.options.fractionDigits);
  }
  
  /**
   * @private
   */
  private drawTimer(): void {
    this.timerNode.innerText = this.formatTime(this.timerSeconds);
    
    if (this.options.few !== null) {
      const less = this.timerSeconds <= this.options.few;
      const attr = this.timerNode.hasAttribute(this.config.fewAttr);
      
      if (!less) {
        this.timerNode.removeAttribute(this.config.fewAttr);
        if (this.options.setFewColor) this.timerNode.style.removeProperty('color');
      } else if (!attr) {
        this.timerNode.setAttribute(this.config.fewAttr, '');
        if (this.options.setFewColor) this.timerNode.style.setProperty('color', this.options.fewColor);
      }
    }
    
    if (this.options.saveStateInStorage && this.timerSeconds >= 0) {
      window?.localStorage?.setItem(this.config.storageKey, String(this.timerSeconds));
    }
  }
  
  /**
   * @param options
   * @private
   */
  private validateOptions(options: SimpleTimerRequiredOptions): SimpleTimerRequiredOptions {
    const validation: ValidationOptions = {
      seconds: {
        nullable: false,
        validator: [
          typeof options.seconds !== 'number',
          options.seconds <= 0,
        ],
      },
      few: {
        nullable: true,
        validator: [
          options.few !== null && typeof options.few !== 'number',
          typeof options.few === 'number' && options.few < 0,
          typeof options.few === 'number' && options.few >= options.seconds,
        ],
      },
      fewColor: {
        nullable: true,
        validator: [
          options.fewColor !== null && typeof options.fewColor !== 'string',
          typeof options.fewColor === 'string' && options.fewColor.length === 0,
        ],
      },
      redirectUrl: {
        nullable: true,
        validator: [
          options.redirectUrl !== null && typeof options.redirectUrl !== 'string',
          typeof options.redirectUrl === 'string' && options.redirectUrl?.length === 0,
        ],
      },
    };
    
    for (const key in validation) {
      const error = validation[key].validator.some(Boolean);
      if (error) throw new TypeError(`Invalid argument for the "${key}" option was passed`);
    }
    
    return options;
  }
  
  private drawPlaceholder() {
    const { displayMilliseconds, fractionDigits } = this.options;
    const milliseconds = displayMilliseconds ? '.' + '0'.repeat(fractionDigits) : '';
    
    this.timerNode.innerText = '00:00:00' + milliseconds;
  }
}

export default SimpleTimer;