import { Results } from '@/components'
import { COLLECTIONS } from '@/constants'
import { getDocById } from '@/util/firebase'

const SingleResultPage = async ({ params }: { params: { id: string } }) => {
    const pageData = await getDocById(COLLECTIONS.POLLS, params.id)
    const page = pageData.data as PollType
    page.options.sort((a, b) => {
        const voteDifference = (b.votes || 0) - (a.votes || 0)

        if (voteDifference === 0) {
            return a.name.localeCompare(b.name)
        }

        return voteDifference
    })
    const firstPlace = page.options[0]

    return <Results page={page} firstPlace={firstPlace} />
}
export default SingleResultPage
