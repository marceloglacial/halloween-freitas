import { Card, Footer, Hero, NavBar, Section } from '@/components'
import { secondaryFont } from './util/fonts'

export default function Home() {
    return (
        <>
            <Hero />
            <main className='relative z-40 flex flex-col bg-primary-content'>
                <div className='relative p-24 top-[-150px] mb-[-150px] grid grid-flow-col gap-8'>
                    <Card
                        title={'Quando?'}
                        icon={'👻'}
                        description={
                            <p>
                                📅 Data: 28 de outubro <br />
                                🕖 Hora: 19:00 <br />
                                Estamos convocando todos os fantasmas, bruxas, vampiros e monstros
                                para uma festa de Halloween que fará até os mortos-vivos se
                                agitarem!
                            </p>
                        }
                    />
                    <Card
                        title={'Quando?'}
                        icon={'☠️'}
                        description={
                            <p>
                                📅 Data: 28 de outubro <br />
                                🕖 Hora: 19:00 <br />
                                Estamos convocando todos os fantasmas, bruxas, vampiros e monstros
                                para uma festa de Halloween que fará até os mortos-vivos se
                                agitarem!
                            </p>
                        }
                    />
                    <Card
                        title={'Quando?'}
                        icon={'🦇'}
                        description={
                            <p>
                                📅 Data: 28 de outubro <br />
                                🕖 Hora: 19:00 <br />
                                Estamos convocando todos os fantasmas, bruxas, vampiros e monstros
                                para uma festa de Halloween que fará até os mortos-vivos se
                                agitarem!
                            </p>
                        }
                    />
                </div>
                <Section icon={'🕸️'} title={'Programação'}>
                    <div className='grid grid-flow-col grid-cols-2 gap-8'>
                        <div className=' flex flex-col gap-4'>
                            <p>
                                Temos um trato mágico para você: um concurso de fantasias que vai
                                fazer o chão tremer!
                            </p>
                            <p>
                                Prêmios inacreditáveis aguardam os vencedores, então solte a sua
                                imaginação e prepare-se para assombrar!
                            </p>
                            <p>
                                Seja você um espirito assombroso, uma bruxa maravilhosa ou um ser de
                                outro mundo, sua criatividade é sua melhor arma!
                            </p>
                        </div>
                        <div className='bg-black p-8 rounded-2xl shadow-2xl relative overflow-hidden'>
                            <div>
                                <div className='absolute top-8 right-8 text-9xl z-0'>🧌</div>
                                <div className='absolute bottom-0 right-[100px] text-9xl z-20'>
                                    🧛
                                </div>
                                <div className='absolute top-[30px] right-[180px] text-9xl z-10'>
                                    🧟
                                </div>
                                <div className='absolute bottom-0 right-[280px] text-9xl z-30'>
                                    🦹
                                </div>
                            </div>
                            <div className=' text-xl flex flex-col gap-4'>
                                <h4 className={`${secondaryFont.className} text-4xl`}>Premiação</h4>
                                <p>🏆 Melhor fantsia</p>
                                <p>🎖️ Fantasia mais criativa</p>
                                <p>💩 E muito mais ...</p>
                            </div>
                        </div>
                    </div>
                </Section>
                <Section icon={'💀'} title={'É só chegar!'} variant='base-100'>
                    <div className='text-center'>
                        <p>
                            Nada de medo, venha se juntar a nós para uma noite de diversão
                            assustadora e lembranças arrepiantes.
                        </p>
                        <p>Esteja pronto para ser enfeitiçado!</p>
                        <p>Avise-nos se você se atreverá a participar da festa!</p>
                        <p>Detalhes adicionais serão compartilhados em breve.</p>
                        <p>Fique ligado para mais informações, ou melhor, para mais aparições!</p>
                        <p className='text-3xl'>Confirme sua presença até 20 de outubro!</p>
                    </div>
                </Section>
            </main>
            <Footer />
        </>
    )
}
