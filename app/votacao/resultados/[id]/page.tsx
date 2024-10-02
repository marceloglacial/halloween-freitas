import { getCollectionById } from '@/lib'
import { getPollResults } from '@/lib/getResults'
import { PageSection } from './PageSection'

const PollsPage = async ({ params }: { params: { id: string } }) => {
    const data = (await getCollectionById('polls')) as PollType[]
    const poll = data.find((item) => item.id === params.id)

    if (!poll) return <>Não existe essa votação</>

    const results = getPollResults(poll)

    return <PageSection poll={poll} results={results} />
}

export default PollsPage
