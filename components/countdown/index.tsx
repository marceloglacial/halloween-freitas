"use client";
import React from "react";
import { useCountdown } from "@/hooks/useCountdown";
import { EVENT_DATE } from "@/constants/globals";
import { isTimeLeftZero, pad } from "@/util/countdown";
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
      <h2 className="text-2xl lg:text-4xl text-center">
        Preparem suas vassouras e poções, pois a noite mais assustadora do ano
        COMEÇOU!!
      </h2>
    );
  }

  return (
    <div className="flex items-start justify-center w-full gap-2 count-down-main">
      {timerUnits.map((unit, idx) => (
        <React.Fragment key={unit.key}>
          <TimerBlock value={timeLeft[unit.key]} label={unit.label} />
          {idx < timerUnits.length - 1 && (
            <h3 className="font-semibold text-2xl text-white pt-6">:</h3>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default Countdown;
