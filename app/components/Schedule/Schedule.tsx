import { Section } from '@/components'
import { secondaryFont } from '@/util/fonts'

const Schedule = () => {
    return (
        <Section icon={'🦇'} title={'Programação'}>
            <div className='grid xl:grid-cols-2 gap-8  max-w-screen-sm lg:max-w-screen-md xl:max-w-screen-xl mx-auto'>
                <div className='flex flex-col gap-4'>
                    <p>
                        Temos um trato mágico para você: <br /> um
                        <strong className='text-primary'> concurso de fantasias</strong> que vai
                        fazer o chão tremer!
                    </p>
                    <p>
                        Prêmios inacreditáveis aguardam os vencedores, então solte a sua imaginação
                        e prepare-se para assombrar!
                    </p>
                    <p>
                        Seja você um espirito assombroso, uma bruxa maravilhosa ou um ser de outro
                        mundo, sua criatividade é sua melhor arma!
                    </p>
                </div>
                <div className='bg-black p-8 lg:p-12 rounded-2xl shadow-2xl grid md:grid-cols-2'>
                    <div className='lg:text-xl flex flex-col gap-4 justify-center'>
                        <h4 className={`${secondaryFont.className} text-4xl pb-8`}>Premiação</h4>
                        <p>🏆 Melhor fantsia</p>
                        <p>🎖️ Fantasia mais criativa</p>
                        <p>💩 E muito mais ...</p>
                    </div>

                    <div className='relative w-full h-full text-center flex flex-wrap gap-8 justify-center pt-8 md:pt-0'>
                        <div className='md:absolute top-0 left-0 text-8xl md:text-9xl z-20'>🧛</div>
                        <div className='md:absolute top-0 right-0 text-8xl md:text-9xl z-0'>🧙‍♀️</div>
                        <div className='md:absolute bottom-0 md:left-[50%] md:translate-x-[-50%] text-8xl md:text-9xl z-30'>
                            🦹
                        </div>
                    </div>
                </div>
            </div>
        </Section>
    )
}
export default Schedule
