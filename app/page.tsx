import { Card, Footer, Hero, NavBar } from '@/components'
import { secondaryFont } from './util/fonts'

export default function Home() {
    return (
        <>
            <Hero />
            <main className='relative z-40 flex flex-col gap-8 bg-primary-content'>
                <div className='relative p-24 top-[-150px] mb-[-150px] grid grid-flow-col gap-8'>
                    <Card />
                    <Card />
                    <Card />
                </div>
                <div className='bg-secondary-focus py-24 relative'>
                    <div className=' absolute top-[-60px] left-[50%] translate-x-[-50%] text-9xl'>
                        🕸️
                    </div>
                    <h3 className={`${secondaryFont.className} text-8xl text-center`}>
                        Programação
                    </h3>
                    <div className='grid grid-flow-col grid-cols-2 gap-8 p-24'>
                        <div className=' flex flex-col gap-4 text-2xl'>
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
                </div>
                <div className='grid grid-flow-col gap-8 p-24'>
                    Nada de medo, venha se juntar a nós para uma noite de diversão assustadora e
                    lembranças arrepiantes. Nos vemos em 28 de outubro às 19:00! Esteja pronto para
                    ser enfeitiçado! 🧙‍♀️ Confirme sua presença até 20 de outubro - Avise-nos se você
                    se atreverá a participar da festa! 🎃🦇🕷️ A localização e detalhes adicionais
                    serão compartilhados em breve. Fique ligado para mais informações, ou melhor,
                    para mais aparições! 📲🦉🌕
                </div>
            </main>
            <Footer />
        </>
    )
}
