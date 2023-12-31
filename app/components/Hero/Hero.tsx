'use client'
import { secondaryFont } from '@/util/fonts'
import { Countdown } from '@/components'
// TODO: Credits - https://www.vecteezy.com/video/1625536-mystery-and-spooky-dark-forest-with-lightning-and-moving-clouds
const Hero = () => {
    return (
        <div className={`hero lg:min-h-screen 2xl:min-h-[900px] relative overflow-hidden`}>
            <video
                autoPlay
                playsInline
                loop
                muted
                className='absolute top-0 left-0 z-10 w-auto min-w-full min-h-full max-w-none'
                src='/hero-video.mp4'
            />
            <div className='hero-content text-center text-neutral-content relative z-30'>
                <div className='max-w-2xl flex flex-col items-center gap-4 py-12 lg:p-0'>
                    <h1 className={`text-7xl lg:text-9xl font-bold ${secondaryFont.className}`}>
                        🎃 <br />
                        Halloween dos Freitas
                    </h1>
                    <h2 className='text-2xl lg:text-4xl'>
                        Preparem suas vassouras e poções, pois a noite mais assustadora do ano se
                        aproxima!
                    </h2>
                    <Countdown />
                </div>
            </div>
        </div>
    )
}
export default Hero
