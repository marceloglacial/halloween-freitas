import { Section } from '@/components'

const ExtraInfo = () => {
    return (
        <Section icon={'💀'} title={'É só chegar!'} variant='base'>
            <div className='relative'>
                <div className='content text-center lg:px-24 '>
                    <p>
                        Nada de medo, venha se juntar a nós para uma noite assustadora e lembranças
                        arrepiantes. Avise-nos se você se atreverá a participar da festa!
                    </p>
                    <p>Detalhes adicionais serão compartilhados em breve.</p>
                    <p>Fique ligado para mais informações, ou melhor, para mais aparições!</p>
                    <br /> <br />
                    <p className=' text-2xl lg:text-3xl text-accent'>
                        Confirme sua presença até 20 de outubro!
                    </p>
                </div>
                <div className='absolute top-0 right-0 text-[25rem] opacity-10'>🕸️</div>
                <div className='hidden lg:block absolute bottom-0 left-0  text-[25rem] opacity-10'>
                    🕸️
                </div>
            </div>
        </Section>
    )
}
export default ExtraInfo
