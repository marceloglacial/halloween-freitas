"use client";
import React from "react";
import { useCountdown } from "@/hooks/useCountdown";
import { EVENT_DATE } from "@/constants/globals";
import { isTimeLeftZero } from "@/util/countdown";
import TimerBlock from "./timer-block";

const TARGET_DATE: Date = new Date(EVENT_DATE);
const timerUnits = [
  { key: "days", label: "dias" },
  { key: "hours", label: "horas" },
  { key: "minutes", label: "min" },
  { key: "seconds", label: "seg" },
] as const;

const Countdown: React.FC = () => {
  const timeLeft: TimeLeft = useCountdown(TARGET_DATE);

  if (isTimeLeftZero(timeLeft)) {
    return (
      <h2 className="text-center text-2xl lg:text-4xl">
        Preparem suas vassouras e poções, pois a noite mais assustadora do ano
        COMEÇOU!!
      </h2>
    );
  }

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
