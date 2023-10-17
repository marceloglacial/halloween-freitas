'use client'

import { secondaryFont } from '@/util/fonts'
import { useCountdown } from '@/hooks/useCountdown'

interface CountdownProps {
    finalDate: Date
}

const Countdown: React.FC<CountdownProps> = ({ finalDate }) => {
    const timeLeft = useCountdown(finalDate)

    return (
        <div className={`grid grid-flow-col gap-5 text-center auto-cols-max`}>
            <div className='flex flex-col p-2 bg-black rounded-box text-neutral-content'>
                <span className={`countdown font-mono text-5xl ${secondaryFont.className}`}>
                    {/* @ts-ignore */}
                    <span style={{ '--value': timeLeft.days }}></span>
                </span>
                days
            </div>
            <div className='flex flex-col p-2 bg-black rounded-box text-neutral-content'>
                <span className={`countdown font-mono text-5xl ${secondaryFont.className}`}>
                    {/* @ts-ignore */}
                    <span style={{ '--value': timeLeft.hours }}></span>
                </span>
                hours
            </div>
            <div className='flex flex-col p-2 bg-black rounded-box text-neutral-content'>
                <span className={`countdown font-mono text-5xl ${secondaryFont.className}`}>
                    {/* @ts-ignore */}
                    <span style={{ '--value': timeLeft.minutes }}></span>
                </span>
                min
            </div>
            <div className='flex flex-col p-2 bg-black rounded-box text-neutral-content'>
                <span className={`countdown font-mono text-5xl ${secondaryFont.className}`}>
                    {/* @ts-ignore */}
                    <span style={{ '--value': timeLeft.seconds }}></span>
                </span>
                sec
            </div>
        </div>
    )
}

export default Countdown
