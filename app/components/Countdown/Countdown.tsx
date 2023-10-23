'use client'
import { secondaryFont } from '@/util/fonts'
import Countdown from 'react-countdown'

// @ts-ignore
const Renderer = ({ hours, days, minutes, seconds, completed }) => {
    if (completed) {
        return <></>
    } else {
        return (
            <div className={`grid grid-flow-col gap-2 lg:gap-5 text-center auto-cols-max`}>
                <div className='flex flex-col p-2 bg-black rounded-box text-neutral-content'>
                    <span
                        className={`countdown font-mono text-center text-4xl lg:text-7xl ${secondaryFont.className}`}
                    >
                        {/* @ts-ignore */}
                        <span style={{ '--value': days }}></span>
                    </span>
                    dias
                </div>
                <div className='flex flex-col p-2 bg-black rounded-box text-neutral-content'>
                    <span
                        className={`countdown font-mono text-center text-4xl lg:text-7xl ${secondaryFont.className}`}
                    >
                        {/* @ts-ignore */}
                        <span style={{ '--value': hours }}></span>
                    </span>
                    horas
                </div>
                <div className='flex flex-col p-2 bg-black rounded-box text-neutral-content'>
                    <span
                        className={`countdown font-mono text-center text-4xl lg:text-7xl ${secondaryFont.className}`}
                    >
                        {/* @ts-ignore */}
                        <span style={{ '--value': minutes }}></span>
                    </span>
                    min
                </div>
                <div className='flex flex-col p-2 bg-black rounded-box text-neutral-content'>
                    <span
                        className={`countdown font-mono text-center text-4xl lg:text-7xl ${secondaryFont.className}`}
                    >
                        {/* @ts-ignore */}
                        <span style={{ '--value': seconds }}></span>
                    </span>
                    seg
                </div>
            </div>
        )
    }
}

const CountdownComponent: React.FC = () => {
    return <Countdown date={new Date('Oct 28 2023 19:00:00 EST')} renderer={Renderer} />
}

export default CountdownComponent
