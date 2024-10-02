import { Section } from '@/components'

const ExtraInfo = () => {
    return (
        <Section id='confirme' icon={'💀'} title={'É só chegar!'} variant='base'>
            <div className='absolute z-0 top-0 lg:top-[15rem] right-0 text-[25rem] opacity-10'>
                🕸️
            </div>
            <div className='relative text-center lg:px-24'>
                <p>
                    Nada de medo, venha se juntar a nós para uma noite assustadora e lembranças
                    arrepiantes. Avise-nos se você se atreverá a participar da festa!
                </p>
                <p>Detalhes adicionais serão compartilhados em breve.</p>
                <p>Fique ligado para mais informações, ou melhor, para mais aparições!</p>
                <br /> <br />
                <div className='relative z-10'>
                    <p className='text-2xl lg:text-3xl text-primary max-w-[600px] mx-auto'>
                        Confirme sua presença até
                        <br />
                        <span className='underline'> 20 de outubro</span>!
                    </p>
                </div>
                <div className='hidden lg:block absolute bottom-0 left-0 text-[25rem] opacity-10'>
                    🕸️
                </div>
            </div>
        </Section>
    )
}
export default ExtraInfo
