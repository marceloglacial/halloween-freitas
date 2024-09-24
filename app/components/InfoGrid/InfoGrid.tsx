import { Card } from '@/components'

const InfoGrid = () => {
    return (
        <div className='relative bg-primary-content'>
            <div className='relative  p-8 md:px-0 xl:py-24 top-[-70px] xl:top-[-140px] xl:mb-[-100px] grid xl:grid-cols-3 gap-8 max-w-screen-sm lg:max-w-screen-md xl:max-w-screen-xl mx-auto'>
                <Card
                    title={'Onde?'}
                    icon={'👻'}
                    description={
                        <p>
                            Estamos convocando todos os fantasmas, bruxas, vampiros e monstros para
                            uma festa na{' '}
                            <strong className='text-accent'>Mansão Assombrada dos Freitas</strong>{' '}
                            que fará até os mortos-vivos se agitarem!
                        </p>
                    }
                />
                <Card
                    title={'Quando?'}
                    icon={'🧛🏻‍♂️'}
                    description={
                        <p>
                            <strong className=' text-accent'>📅 26 de outubro de 2024</strong>{' '}
                            <br />
                            <strong className=' text-accent'>🕖 19:00</strong>
                            <br />A festa só acaba quando os vampiros voltarem para os caixões, ou
                            seja, até o sol raiar!
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
                            <strong className=' text-accent'>
                                prato sinistro para compartilhar
                            </strong>{' '}
                            com todos.
                        </p>
                    }
                />
            </div>
        </div>
    )
}
export default InfoGrid
