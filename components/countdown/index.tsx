"use client";
import React, { JSX } from "react";
import { useCountdown } from "@/hooks/useCountdown";
import { isTimeLeftZero } from "@/util/countdown";
import TimerBlock from "./timer-block";

const timerUnits = [
  { key: "days", label: "dias" },
  { key: "hours", label: "horas" },
  { key: "minutes", label: "min" },
  { key: "seconds", label: "seg" },
] as const;

const Countdown: React.FC<{ targetDate: string; initialNow: string }> = ({
  targetDate,
  initialNow,
}): JSX.Element => {
  const timeLeft: TimeLeft = useCountdown(targetDate, initialNow);

  if (isTimeLeftZero(timeLeft)) return <></>;

  return (
    <div className="count-down-main flex w-full items-start justify-center gap-2">
      {timerUnits.map((unit, idx) => (
        <React.Fragment key={unit.key}>
          <TimerBlock value={timeLeft[unit.key]} label={unit.label} />
          {idx < timerUnits.length - 1 && (
            <h3 className="pt-6 text-2xl font-semibold text-white">:</h3>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default Countdown;
