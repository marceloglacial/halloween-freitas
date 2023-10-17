import { Card } from '@/components'

const InfoGrid = () => {
    return (
        <div className='relative z-40 p-24 top-[-150px] mb-[-80px] grid grid-cols-3 gap-8'>
            <Card
                title={'Onde?'}
                icon={'👻'}
                description={
                    <p>
                        Estamos convocando todos os fantasmas, bruxas, vampiros e monstros para uma
                        festa na{' '}
                        <strong className='text-accent'>Mansão Assombrada dos Freitas</strong> que
                        fará até os mortos-vivos se agitarem!
                    </p>
                }
            />
            <Card
                title={'Quando?'}
                icon={'🧛🏻‍♂️'}
                description={
                    <p>
                        <strong className=' text-accent'>📅 28 de outubro de 2023</strong> <br />
                        <strong className=' text-accent'>🕖 19:00</strong>
                        <br />A festa só acaba quando os vampiros voltarem para os caixões, ou seja,
                        quando o sol raiar!
                    </p>
                }
            />
            <Card
                title={'O que levar?'}
                icon={'🧪'}
                description={
                    <p>
                        Prepare sua poção secreta e prato favorito para uma noite de sustos e
                        delícias! Cada um deve trazer{' '}
                        <strong className=' text-accent'>sua bebida encantada</strong> e um{' '}
                        <strong className=' text-accent'>prato sinistro para compartilhar</strong>{' '}
                        com todos.
                    </p>
                }
            />
        </div>
    )
}
export default InfoGrid
