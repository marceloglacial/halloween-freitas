export const pad = (num: number): string =>
  num < 10 ? `0${num}` : String(num);

export const isTimeLeftZero = (timeLeft: TimeLeft): boolean =>
  Object.values(timeLeft).every((v): v is 0 => v === 0);
