class DateFormat {
  static secondsToFormattedTime(seconds: number) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    // Добавляем ведущий ноль, если число меньше 10
    const pad = (num: number) => num.toString().padStart(2, '0');
    
    return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
  }
  
  static secondsToTime(seconds: number) {
    const hours = Math.floor(seconds / 3600);
    const remainingSeconds = seconds % 3600;
    const minutes = Math.floor(remainingSeconds / 60);
    const secs = remainingSeconds % 60;
    
    return { hours, minutes, seconds: secs };
  }
  
  static formatTime(seconds: number, displayMs = false, fractionDigits: 1 | 2 | 3) {
    const date = new Date(0);
    const substring = !displayMs ? 19 : 20 + fractionDigits;
    
    date.setMilliseconds(seconds * 1000);
    return date.toISOString().substring(11, substring);
  }
}

export default DateFormat;