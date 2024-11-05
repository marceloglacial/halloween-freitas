import { Card } from '@/components'
import { COLLECTIONS } from '@/constants'
import { getAllDocsFromCollection } from '@/util/firebase'
import { secondaryFont } from '@/util/fonts'
import Link from 'next/link'

const ResultsPage = async () => {
    const pollsData = (await getAllDocsFromCollection(COLLECTIONS.POLLS)) as PollApiResponse

    const polls = pollsData.data

    return (
        <div className='grid min-h-screen items-center max-w-screen-lg mx-auto'>
            <div className='grid grid-cols-1 gap-8 p-8'>
                <h1 className={`${secondaryFont.className} text-6xl text-center`}>Resultados</h1>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
                    {polls.map((poll, index) => {
                        return (
                            <Link
                                key={poll.id}
                                className={` ${index === 0 ? ' md:col-span-2 justify-center' : 'contents'}`}
                                href={`/resultados/${poll.id}`}
                            >
                                <Card title={poll.title} icon={poll.icon} />
                            </Link>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

export default ResultsPage
