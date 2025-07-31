import DateFormat from './DateFormat.ts';

type ValidationOptions = Record<string, { nullable: boolean, validator: boolean[] }>

interface SimpleTimerConstructorOptions {
  // Время после которого таймер загорается красным
  few: number,
  // Изначальное время
  seconds: number,
  // Цвет окраски таймера при атрибуте data-few=""
  fewColor: string | null,
  // Можно выключить перекраску из JS и делать это самому через стили
  setFewColor: boolean,
  // Параметр для отладки, после истечения времени таймер будет увеличиваться
  // В общем отпрыгивать от 00:00:00 и 00:15:00
  bounce: boolean,
  // Включить/выключить редирект по истечению таймера
  redirect: boolean,
  // Ссылка на которую нужно перенаправить пользователя
  redirectUrl: string | null,
  // Сохранять состояние таймера в браузере
  saveStateInStorage: boolean,
}

/**
 * @version 1.0.0
 * @author awenn2015@gmail.com
 * @link https://relaxdd.github.io/
 * @lastUpdate 31 July 2025, 13:55 +04
 */
class SimpleTimer {
  private timerNode: HTMLElement;
  private options: SimpleTimerConstructorOptions;
  
  /**
   * @param selector Селектор искомого элемента в который нужно внедрить таймер
   * @param options Функция, которая будет вызываться по истечении интервала
   */
  public constructor(selector: string, options: SimpleTimerConstructorOptions) {
    if (!selector) throw new Error('Invalid selector');
    
    const timerNode = document.querySelector<HTMLElement>(selector);
    if (!timerNode) throw new Error('Invalid timer node');
    
    this.timerNode = timerNode;
    
    const defaultOptions = {
      seconds: 900,
      few: null,
      fewColor: 'red',
      setFewColor: false,
      bounce: false,
      redirect: false,
      redirectUrl: null,
      saveStateInStorage: false,
    };
    
    this.options = this.validateOptions({ ...defaultOptions, ...options });
  }
  
  public init(): void {
    if (this.options.saveStateInStorage && 'localStorage' in window) {
      const prevTime = window.localStorage.getItem('la5yPNRGnSn7tnK');
      if (prevTime && +prevTime >= 0) this.options.seconds = +prevTime;
    }
    
    this.updateTime(this.options.seconds);
    if (!this.options.seconds) return;
    
    let flag = true;
    let nextTime = this.options.seconds;
    
    const timerInterval = setInterval(() => {
      if (flag) nextTime -= 1;
      else nextTime += 1;
      
      this.updateTime(nextTime);
      
      if (!this.options.bounce && nextTime === 0) {
        clearInterval(timerInterval);
        
        if (this.options.redirect && this.options.redirectUrl) {
          setTimeout(() => {
            window.location.href = this.options.redirectUrl!;
          }, 1000);
        }
      }
      
      if (this.options.bounce && nextTime === 0 || nextTime === this.options.seconds) flag = !flag;
    }, 1000);
  }
  
  /**
   * @param seconds
   * @private
   */
  private updateTime(seconds: number): void {
    this.timerNode.innerText = DateFormat.formatTime(seconds);
    
    if (this.options.setFewColor) {
      const less = seconds <= this.options.few;
      const attr = this.timerNode.hasAttribute('data-few');
      
      if (!less) {
        this.timerNode.removeAttribute('data-few');
        if (this.options.setFewColor) this.timerNode.style.removeProperty('color');
      } else if (!attr) {
        this.timerNode.setAttribute('data-few', '');
        if (this.options.setFewColor) this.timerNode.style.setProperty('color', this.options.fewColor);
      }
    }
    
    if (this.options.saveStateInStorage && seconds >= 0) {
      window?.localStorage?.setItem('la5yPNRGnSn7tnK', String(seconds));
    }
  }
  
  /**
   * @param options
   * @private
   */
  private validateOptions(options: SimpleTimerConstructorOptions): SimpleTimerConstructorOptions {
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
          options.few < 0,
          options.few >= options.seconds,
        ],
      },
      fewColor: {
        nullable: true,
        validator: [
          options.fewColor !== null && typeof options.fewColor !== 'string',
          options.fewColor?.length === 0,
        ],
      },
      redirectUrl: {
        nullable: true,
        validator: [
          options.redirectUrl !== null && typeof options.redirectUrl !== 'string',
          options.redirectUrl?.length === 0,
        ],
      },
    };
    
    for (const key in validation) {
      const error = validation[key].validator.some(Boolean);
      if (error) throw new TypeError(`Invalid argument for the "${key}" option was passed`);
    }
    
    return options;
  }
}

export default SimpleTimer;