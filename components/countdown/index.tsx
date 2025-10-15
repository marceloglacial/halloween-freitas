"use client";
import React from "react";
import { useCountdown } from "@/hooks/useCountdown";
import { EVENT_DATE } from "@/constants/globals";
import { secondaryFont } from "@/util/fonts";

const TARGET_DATE = new Date(EVENT_DATE);

const Countdown = () => {
  const timeLeft = useCountdown(TARGET_DATE);
  const pad = (num: number) => (num < 10 ? `0${num}` : num);

  const timerUnits = [
    { key: "days", label: "dias", className: "font-medium" },
    { key: "hours", label: "horas", className: "font-normal" },
    { key: "minutes", label: "min", className: "font-normal" },
    { key: "seconds", label: "seg", className: "font-normal" },
  ];

  const TimerBlock = ({
    value,
    label,
    className,
  }: {
    value: number;
    label: string;
    className: string;
  }) => (
    <div className="timer w-16">
      <div className="bg-black/70 py-4 px-2 rounded-lg overflow-hidden">
        <h3
          className={`${secondaryFont.className} text-5xl text-white text-center`}
        >
          {pad(value)}
        </h3>
      </div>
      <p className={`text-lg ${className} text-white mt-1 text-center w-full`}>
        {label}
      </p>
    </div>
  );

  if (Object.values(timeLeft).every((v) => v === 0)) {
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
          <TimerBlock
            value={timeLeft[unit.key as keyof typeof timeLeft]}
            label={unit.label}
            className={unit.className}
          />
          {idx < timerUnits.length - 1 && (
            <h3 className="font-semibold text-2xl text-white pt-6">:</h3>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default Countdown;
