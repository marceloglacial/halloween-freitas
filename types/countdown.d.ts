interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

interface TimerUnit {
  key: keyof TimeLeft;
  label: string;
  className: string;
}

type TimerBlockProps = {
  value: number;
  label: string;
};
