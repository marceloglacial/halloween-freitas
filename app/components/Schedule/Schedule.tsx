import { Section } from '@/components'
import { secondaryFont } from '@/util/fonts'

const Schedule = () => {
    return (
        <Section icon={'🦇'} title={'Programação'} variant='secondary-focus'>
            <div className='grid grid-flow-col grid-cols-2 gap-8'>
                <div className=' flex flex-col gap-4'>
                    <p>
                        Temos um trato mágico para você: <br /> um
                        <strong className=' text-primary'> concurso de fantasias</strong> que vai
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
                <div className='bg-black p-12 rounded-2xl shadow-2xl grid grid-cols-2'>
                    <div className='text-xl flex flex-col gap-4 justify-center'>
                        <h4 className={`${secondaryFont.className} text-4xl`}>Premiação</h4>
                        <p>🏆 Melhor fantsia</p>
                        <p>🎖️ Fantasia mais criativa</p>
                        <p>💩 E muito mais ...</p>
                    </div>

                    <div className='relative w-full h-full'>
                        <div className='absolute top-0 left-0 text-9xl z-20'>🧛</div>
                        <div className='absolute top-0 right-0 text-9xl z-0'>🧙‍♀️</div>
                        <div className='absolute bottom-0 left-[50%] translate-x-[-50%] text-9xl z-30'>
                            🦹
                        </div>
                    </div>
                </div>
            </div>
        </Section>
    )
}
export default Schedule