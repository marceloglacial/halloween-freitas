import { useState, useEffect } from "react";
import { calculateTimeLeft } from "@/util/countdown";

interface CountdownProps {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function useCountdown(
  targetDate: string,
  initialNow: string,
): CountdownProps {
  const [timeLeft, setTimeLeft] = useState<CountdownProps>(() =>
    calculateTimeLeft(targetDate, new Date(initialNow).getTime()),
  );

  useEffect(() => {
    const update = () => setTimeLeft(calculateTimeLeft(targetDate, Date.now()));
    update();
    const interval = setInterval(() => {
      update();
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  return timeLeft;
}
