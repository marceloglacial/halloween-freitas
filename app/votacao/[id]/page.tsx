import { PollForm, Section } from '@/components'
import { getCollectionById, getPollById, getStorageUrlByFileName } from '@/lib'

const PollPage = async ({ params }: { params: { id: string } }) => {
    const poll = (await getPollById(params.id)) as PollType
    const guests = (await getCollectionById('guests')) as GuestType[]
    const allGuests = await Promise.all(
        guests.map(async (guest) => ({
            id: guest.id,
            name: guest.name,
            email: guest.email,
            photo: (await getStorageUrlByFileName(guest.photo)) || '',
        }))
    )
    return (
        <Section title={poll.title}>
            <PollForm pollId={poll.id} guests={allGuests} />
        </Section>
    )
}
export default PollPage
