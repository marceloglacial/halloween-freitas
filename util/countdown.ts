export const pad = (num: number): string =>
  num < 10 ? `0${num}` : String(num);

export const isTimeLeftZero = (timeLeft: TimeLeft): boolean =>
  Object.values(timeLeft).every((v): v is 0 => v === 0);

export function calculateTimeLeft(targetDate: string, now: number): TimeLeft {
  const difference = new Date(targetDate).getTime() - now;

  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((difference % (1000 * 60)) / 1000),
  };
}
