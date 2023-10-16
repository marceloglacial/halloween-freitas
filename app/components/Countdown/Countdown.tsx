import { secondaryFont } from '@/util/fonts'

const Countdown = () => {
    return (
        <div className={`grid grid-flow-col gap-5 text-center auto-cols-max`}>
            <div className='flex flex-col p-2 bg-black rounded-box text-neutral-content'>
                <span className={`countdown font-mono text-5xl ${secondaryFont.className}`}>
                    {/* @ts-ignore */}
                    <span style={{ '--value': 15 }}></span>
                </span>
                days
            </div>
            <div className='flex flex-col p-2 bg-black rounded-box text-neutral-content'>
                <span className={`countdown font-mono text-5xl ${secondaryFont.className}`}>
                    {/* @ts-ignore */}
                    <span style={{ '--value': 10 }}></span>
                </span>
                hours
            </div>
            <div className='flex flex-col p-2 bg-black rounded-box text-neutral-content'>
                <span className={`countdown font-mono text-5xl ${secondaryFont.className}`}>
                    {/* @ts-ignore */}
                    <span style={{ '--value': 24 }}></span>
                </span>
                min
            </div>
            <div className='flex flex-col p-2 bg-black rounded-box text-neutral-content'>
                <span className={`countdown font-mono text-5xl ${secondaryFont.className}`}>
                    {/* @ts-ignore */}
                    <span style={{ '--value': 53 }}></span>
                </span>
                sec
            </div>
        </div>
    )
}

export default Countdown
