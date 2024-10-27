'use client'

import { secondaryFont } from '@/util/fonts'
import { useCountdown } from '@/hooks/useCountdown'

const Countdown: React.FC = () => {
    const timeLeft = useCountdown()

    if (!timeLeft.days && !timeLeft.hours && !timeLeft.minutes)
        return (
            <h2 className='text-2xl lg:text-4xl'>
                Preparem suas vassouras e poções, pois a noite mais assustadora do ano COMEÇOU!!
            </h2>
        )

    return (
        <>
            <h2 className='text-2xl lg:text-4xl'>
                Preparem suas vassouras e poções, pois a noite mais assustadora do ano se aproxima!
            </h2>
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
            <span className='flex p-4 mt-4 md:mb-8 mx-4 bg-secondary rounded-lg'>
                Não esqueça de confirmar sua presença no formulário abaixo!
            </span>
        </>
    )
}

export default Countdown
