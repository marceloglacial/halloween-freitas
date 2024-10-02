import { Section } from '@/components'
import { getCollectionById } from '@/lib'
import Link from 'next/link'

const PollsPage = async () => {
    const data = (await getCollectionById('polls')) as PollType[]

    return (
        <Section title={'Resultados'}>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-8'>
                {data.map((poll) => {
                    return (
                        <Link
                            className='contents'
                            href={`/votacao/resultados/${poll.id}`}
                            key={poll.id}
                        >
                            <div className='card items-center justify-center bg-primary p-8'>
                                <h2>{poll.title}</h2>
                                <p>Total de votos: {poll.totalVotes}</p>
                            </div>
                        </Link>
                    )
                })}
            </div>
        </Section>
    )
}
export default PollsPage
