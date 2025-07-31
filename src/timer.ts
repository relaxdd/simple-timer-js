import SimpleTimer from './class/SimpleTimer.ts';

class Application {
  public timer: SimpleTimer | null = null;
  
  public initialize() {
    // const settingForm = document.querySelector<HTMLFormElement>('#setting-form');
    const timerControls = document.querySelector<HTMLInputElement>('#timer-controls');
    
    const playButton = timerControls?.querySelector<HTMLInputElement>('input[type="button"][data-play]');
    const stopButton = timerControls?.querySelector<HTMLInputElement>('input[type="button"][data-stop]');
    const pauseButton = timerControls?.querySelector<HTMLInputElement>('input[type="button"][data-pause]');
    const resetButton = timerControls?.querySelector<HTMLInputElement>('input[type="button"][data-reset]');
    
    const timer = new SimpleTimer('#timer', {
      few: 30, //
      seconds: 90, //
      fewColor: 'red', //
      setFewColor: true, //
      bounce: false, //
      redirect: false, //
      redirectUrl: null, //
      saveStateInStorage: false, //
      displayMilliseconds: true, //
      fractionDigits: 2,
      autoPlay: false, //
    });
    
    timer.addEventListener('stop', () => {
      console.log('Таймер успешно остановлен');
    });
    
    timer.initialize();
    
    playButton?.addEventListener('click', timer.play.bind(timer));
    stopButton?.addEventListener('click', timer.stop.bind(timer));
    pauseButton?.addEventListener('click', timer.pause.bind(timer));
    resetButton?.addEventListener('click', timer.reset.bind(timer));
  }
}


document.addEventListener('DOMContentLoaded', () => {
  (new Application()).initialize();
});