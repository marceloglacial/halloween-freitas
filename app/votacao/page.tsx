import { Section } from '@/components'
import { getCollectionById } from '@/lib'
import Link from 'next/link'

const PollsPage = async () => {
    const data = (await getCollectionById('polls')) as PollType[]

    return (
        <Section title={'Votação'}>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-8'>
                {data.map((poll) => {
                    return (
                        <Link className='contents' href={`/votacao/${poll.id}`} key={poll.id}>
                            <div className='card items-center justify-center bg-primary p-8'>
                                {poll.title}
                            </div>
                        </Link>
                    )
                })}
            </div>
        </Section>
    )
}
export default PollsPage
