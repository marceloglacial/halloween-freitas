type GuestType = {
    createdAt?: string
    id: string
    name: string
    email: string
    photo?: string
    votes?: number
    polls?: {
        pollId: string
        vote: GuestType
    }[]
}

interface ApiResponse {
    status: 'error' | 'success'
    error?: Error
    data: unknown
}
interface GetSingleGuestResponse extends ApiResponse {
    data: GuestType
}

interface GestAllGuestsResponse extends ApiResponse {
    data: GuestType[] | null
}

type PollType = {
    id: string
    title: string
    icon: string
    options: GuestType[]
    totalVotes?: number
}

interface PollApiResponse extends ApiResponse {
    data: PollType[]
}

interface AlertProps {
    title: string
    variant?: 'info' | 'success' | 'warning' | 'error'
}

interface CardProps {
    title?: string
    id: string
    icon?: string
    disabled?: boolean
    link: string
}

type PhotoType = {
    image: string
    alt: string
}

interface ResultsProps {
    page: PollType
    firstPlace: GuestType
}
