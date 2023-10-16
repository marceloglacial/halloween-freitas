import { secondaryFont } from '@/util/fonts'

const Card = () => {
    return (
        <div className='card  bg-base-100 shadow-xl text-center'>
            <figure>
                <span className='text-8xl p-8'>👻</span>
            </figure>
            <div className='card-body text-center'>
                <h2 className={`${secondaryFont.className} text-4xl`}>Onde?</h2>
                <p className='text-xl'>
                    Data: 28 de outubro 🕖 Hora: 19:00 Estamos convocando todos os fantasmas,
                    bruxas, vampiros e monstros para uma festa de Halloween que fará até os
                    mortos-vivos se agitarem! E temos um trato mágico para você: um concurso de
                    fantasias que vai fazer o chão tremer!
                </p>
            </div>
        </div>
    )
}
export default Card
