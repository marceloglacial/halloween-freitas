'use client'

import { secondaryFont } from '@/util/fonts'
import { useCountdown } from '@/hooks/useCountdown'

const Countdown: React.FC = () => {
    const timeLeft = useCountdown()

    return (
        <div className={`grid grid-flow-col gap-2 lg:gap-5 text-center auto-cols-max`}>
            <div className='flex flex-col p-2 bg-black rounded-box text-neutral-content'>
                <span
                    className={`countdown font-mono text-center text-4xl lg:text-7xl ${secondaryFont.className}`}
                >
                    {/* @ts-ignore */}
                    <span style={{ '--value': timeLeft.days }}></span>
                </span>
                dias
            </div>
            <div className='flex flex-col p-2 bg-black rounded-box text-neutral-content'>
                <span
                    className={`countdown font-mono text-center text-4xl lg:text-7xl ${secondaryFont.className}`}
                >
                    {/* @ts-ignore */}
                    <span style={{ '--value': timeLeft.hours }}></span>
                </span>
                horas
            </div>
            <div className='flex flex-col p-2 bg-black rounded-box text-neutral-content'>
                <span
                    className={`countdown font-mono text-center text-4xl lg:text-7xl ${secondaryFont.className}`}
                >
                    {/* @ts-ignore */}
                    <span style={{ '--value': timeLeft.minutes }}></span>
                </span>
                min
            </div>
            <div className='flex flex-col p-2 bg-black rounded-box text-neutral-content'>
                <span
                    className={`countdown font-mono text-center text-4xl lg:text-7xl ${secondaryFont.className}`}
                >
                    {/* @ts-ignore */}
                    <span style={{ '--value': timeLeft.seconds }}></span>
                </span>
                seg
            </div>
        </div>
    )
}

export default Countdown
