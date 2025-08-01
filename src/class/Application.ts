import SimpleTimer, { type SimpleTimerOptions } from './SimpleTimer.ts';

type AllowedOptionTypes = string | number | boolean | null;
type ApplicationControls = 'play' | 'stop' | 'pause' | 'reset'

class Application {
  public timer: SimpleTimer | null = null;
  
  private readonly controls: Record<ApplicationControls, HTMLInputElement | null> = {
    play: null,
    stop: null,
    pause: null,
    reset: null,
  };
  
  private handlers: Record<ApplicationControls, (() => void) | null> = {
    play: null,
    stop: null,
    pause: null,
    reset: null,
  };
  
  private readonly defaultOptions: SimpleTimerOptions = {
    few: 30,
    seconds: 90,
    fewColor: 'red',
    setFewColor: true,
    saveInStorage: true,
    displayMilliseconds: true,
    fractionDigits: 2,
    autoPlay: false,
  };
  
  
  // private injectOptions(options: SimpleTimerOptions) {
  //   // Not Implemented
  // }
  
  public constructor() {
    const settingForm = document.querySelector<HTMLFormElement>('#setting-form');
    const timerControls = document.querySelector<HTMLInputElement>('#timer-controls');
    
    if (!timerControls) {
      throw new Error('Timer controls wrapper not found.');
    }
    
    this.controls.play = timerControls?.querySelector<HTMLInputElement>('input[type="button"][data-play]');
    this.controls.stop = timerControls?.querySelector<HTMLInputElement>('input[type="button"][data-stop]');
    this.controls.pause = timerControls?.querySelector<HTMLInputElement>('input[type="button"][data-pause]');
    this.controls.reset = timerControls?.querySelector<HTMLInputElement>('input[type="button"][data-reset]');
    
    this.initialize(this.defaultOptions);
    // this.injectOptions(this.defaultOptions);
    
    /*
     * ================================
     */
    
    settingForm?.addEventListener('submit', this.onSettingFormSubmit.bind(this));
  }
  
  public static factory() {
    return new Application();
  }
  
  public initialize(options: SimpleTimerOptions) {
    const mergedOptions = { ...this.defaultOptions, ...options };
    this.timer = new SimpleTimer('#timer', mergedOptions);
    
    this.handlers.play = this.timer.play.bind(this.timer);
    this.handlers.stop = this.timer.stop.bind(this.timer);
    this.handlers.pause = this.timer.pause.bind(this.timer);
    this.handlers.reset = this.timer.reset.bind(this.timer);
    
    this.controls.play?.addEventListener('click', this.handlers.play);
    this.controls.stop?.addEventListener('click', this.handlers.stop);
    this.controls.pause?.addEventListener('click', this.handlers.pause);
    this.controls.reset?.addEventListener('click', this.handlers.reset);
    
    this.timer.initialize();
  }
  
  public destroy() {
    if (this.timer) {
      this.controls.play?.removeEventListener('click', this.handlers.play!);
      this.controls.stop?.removeEventListener('click', this.handlers.stop!);
      this.controls.pause?.removeEventListener('click', this.handlers.pause!);
      this.controls.reset?.removeEventListener('click', this.handlers.reset!);
      
      this.timer.stop();
    }
    
    this.timer = null;
  }
  
  /*
   * ================================
   */
  
  private onSettingFormSubmit(e: SubmitEvent) {
    e.preventDefault();
    
    const formData = new FormData(e.target as HTMLFormElement);
    const parsedData = this.parseOptions(formData);
    
    this.destroy();
    this.initialize(parsedData as unknown as SimpleTimerOptions);
  }
  
  /*
   * ================================
   */
  
  private typeConversion(value: any, type: 'string' | 'number' | 'boolean' | 'object'): AllowedOptionTypes {
    switch (type) {
      case 'string':
        return value !== null ? String(value) : null;
      case 'number':
        return value !== null ? +value : null;
      case 'boolean':
        return !!value;
      case 'object':
        return null;
    }
  }
  
  /**
   * @param formData
   * @private
   */
  private parseOptions(formData: FormData) {
    if (!this.timer) throw new Error('Invalid timer');
    
    return Object.entries(this.timer.getOptionTypes()).reduce<Record<string, AllowedOptionTypes>>((acc, [key, schema]) => {
      const formValue = formData.get(key);
      const optionValue = formValue && String(formValue);
      const normalValue = this.typeConversion(optionValue, schema.type);
      const isNotBoolean = ['string', 'number'].includes(typeof normalValue);
      
      if (schema.nullable && isNotBoolean && !normalValue) {
        acc[key] = null;
        return acc;
      }
      
      acc[key] = normalValue;
      return acc;
    }, {} as never);
  }
}

export default Application;