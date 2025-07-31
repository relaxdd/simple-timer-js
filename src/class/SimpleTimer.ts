import DateFormat from './DateFormat.ts';

interface SimpleTimerOptions {
  // Идентификатор таймера
  storageId?: string | null,
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
  /** Старайтесь не ставить 3, это может сказаться на производительности */
  fractionDigits?: AllowedFractionDigits,
}

type AllowedFractionDigits = 1 | 2;
type SimpleTimerRequiredOptions = Required<SimpleTimerOptions>
type ValidationOptions = Record<string, { nullable: boolean, validator: boolean[] }>

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
  private readonly second: number = 1000;
  private readonly storageAvailable: boolean = false;
  private readonly options: SimpleTimerRequiredOptions;
  
  private timerNode: HTMLElement;
  private timerInterval: number;
  private timerSeconds: number;
  private timerState: TimerState;
  // private storageKey: string;
  
  private initialized = false;
  private directionFlag = true;
  
  private config = {
    fewAttr: 'data-few',
    storagePrefix: '_awenn2015_simple_timer_',
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
    this.timerNode = timerNode;
    this.timerState = TimerState.stop;
    this.storageAvailable = this.getStorageAvailable();
    
    /*
     * ==============================
     */
    
    const defaultOptions: SimpleTimerRequiredOptions = {
      seconds: 900,
      few: null,
      fewColor: 'red',
      setFewColor: false,
      redirect: false,
      redirectUrl: null,
      saveStateInStorage: false,
      displayMilliseconds: false,
      fractionDigits: 1,
      autoPlay: true,
      storageId: null,
      bounce: false,
    };
    
    const mergedOptions: Required<SimpleTimerOptions> = { ...defaultOptions, ...options };
    
    if (mergedOptions.fractionDigits > 2) mergedOptions.fractionDigits = 2;
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
  
  /*
   * ====================================
   */
  
  /**
   * @public
   */
  public initialize(): void {
    if (this.initialized) {
      throw new Error('Invalid initialization');
    }
    
    this.timerSeconds = this.options.seconds;
    this.writeTimerSecondsFromStorage();
    
    if (!this.options.autoPlay) {
      this.drawTimer();
      this.setStateAndNotifyListeners(TimerState.pause);
    } else {
      this.playTimer();
      this.notifyListeners(TimerState.play);
    }
    
    this.initialized = true;
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
    const {
      few,
      fewColor,
      setFewColor,
      saveStateInStorage,
    } = this.options;
    
    this.timerNode.innerText = this.formatTime(this.timerSeconds);
    
    if (few !== null) {
      const less = this.timerSeconds <= few;
      const attr = this.timerNode.hasAttribute(this.config.fewAttr);
      
      if (!less) {
        this.timerNode.removeAttribute(this.config.fewAttr);
        if (setFewColor) this.timerNode.style.removeProperty('color');
      } else if (!attr) {
        this.timerNode.setAttribute(this.config.fewAttr, '');
        if (setFewColor) this.timerNode.style.setProperty('color', fewColor);
      }
    }
    
    /*
     * TODO: Оптимизировать что бы очистка не происходила на каждом тике
     */
    if (this.storageAvailable && saveStateInStorage && this.timerSeconds >= 0) {
      const storageKey = this.getStorageKey();
      localStorage.setItem(storageKey, String(this.timerSeconds));
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
  
  /**
   * @private
   */
  private drawPlaceholder() {
    const { displayMilliseconds, fractionDigits } = this.options;
    const milliseconds = displayMilliseconds ? '.' + '0'.repeat(fractionDigits) : '';
    
    this.timerNode.innerText = '00:00:00' + milliseconds;
  }
  
  private getStorageKey() {
    const nowTimerId = this.getStorageIdAndClearOthers() || this.findPrevStorageIdAndClearOthers() || this.generateStorageId();
    return this.config.storagePrefix + nowTimerId;
  };
  
  /**
   * @private
   */
  private getStorageAvailable(): boolean {
    try {
      const testKey = '__test__';
      localStorage.setItem(testKey, testKey);
      localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  }
  
  /**
   * Unification of forEach and find to bypass localStorage
   *
   * @param callback
   * @private
   */
  private loopStorage(callback: (key: string) => void | boolean): string | null {
    if (!this.storageAvailable) {
      return null;
    }
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) break;
      
      const result = callback(key);
      if (typeof result === 'boolean' && result) return key;
    }
    
    return null;
  }
  
  /**
   * @param nowStorageId
   * @private
   */
  private clearStorageIds(nowStorageId: string | null): void {
    if (!this.storageAvailable) return;
    
    this.loopStorage((key) => {
      if (key.startsWith(this.config.storagePrefix)) {
        if (nowStorageId && key.endsWith(nowStorageId)) {
          return;
        }
        
        localStorage.removeItem(key);
      }
    });
  }
  
  /**
   * @private
   */
  private findPrevStorageKey() {
    if (!this.storageAvailable) return null;
    return this.loopStorage((key) => key.startsWith(this.config.storagePrefix));
  }
  
  /**
   * @private
   */
  private findPrevStorageId() {
    if (!this.storageAvailable) return null;
    const key = this.findPrevStorageKey();
    return key && key.replace(this.config.storagePrefix, '');
  }
  
  /**
   * @private
   */
  private findPrevStorageIdAndClearOthers(): string | null {
    if (!this.storageAvailable) return null;
    
    const storageId = this.findPrevStorageId();
    if (!storageId) return null;
    
    this.clearStorageIds(storageId);
    return storageId;
  }
  
  /**
   * @private
   */
  private getStorageIdAndClearOthers() {
    if (this.options.storageId) {
      this.clearStorageIds(this.options.storageId);
    }
    
    return this.options.storageId;
  }
  
  /**
   * @param length
   * @private
   */
  private generateStorageId(length = 15) {
    const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * chars.length);
      result += chars[randomIndex];
    }
    
    return result;
  }
  
  /**
   * @private
   */
  private writeTimerSecondsFromStorage() {
    if (!this.storageAvailable) return;
    
    if (!this.options.saveStateInStorage)
      this.clearStorageIds(null);
    else {
      const storageId = this.options.storageId || this.findPrevStorageId();
      if (!storageId) return;
      
      const storageKey = this.config.storagePrefix + storageId;
      const prevTime = localStorage.getItem(storageKey);
      
      if (prevTime && +prevTime >= 0) this.timerSeconds = +prevTime;
    }
  }
}

export default SimpleTimer;