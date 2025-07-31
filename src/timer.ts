import SimpleTimer from './class/SimpleTimer.ts';

function main() {
  const timer = new SimpleTimer('#timer', {
    few: 30,
    seconds: 90,
    fewColor: 'red',
    setFewColor: true,
    bounce: false,
    redirect: false,
    redirectUrl: null,
    saveStateInStorage: true,
  });
  
  timer.init();
}

document.addEventListener('DOMContentLoaded', main);