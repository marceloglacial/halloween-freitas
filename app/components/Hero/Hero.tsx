import { secondaryFont } from '@/util/fonts'
import { Countdown } from '..'
// TODO: Credits - https://www.vecteezy.com/video/1625536-mystery-and-spooky-dark-forest-with-lightning-and-moving-clouds
const Hero = () => {
    return (
        <div className={`hero min-h-screen relative overflow-hidden`}>
            <video
                autoPlay
                playsInline
                loop
                muted
                className='absolute top-0 left-0 z-10 w-auto min-w-full min-h-full max-w-none'
                src='https://static.vecteezy.com/system/resources/previews/001/625/536/mp4/mystery-and-spooky-dark-forest-with-lightning-and-moving-clouds-free-video.mp4'
            />
            <div className='hero-content text-center text-neutral-content relative z-30'>
                <div className='max-w-2xl flex flex-col items-center gap-4'>
                    <h1 className={`text-9xl font-bold ${secondaryFont.className}`}>
                        🎃 Halloween dos Mundiças
                    </h1>
                    <h2 className='text-4xl'>
                        Preparem suas vassouras e poções, pois a noite mais assustadora do ano se
                        aproxima! 👻
                    </h2>
                    <Countdown />
                </div>
            </div>
        </div>
    )
}
export default Hero