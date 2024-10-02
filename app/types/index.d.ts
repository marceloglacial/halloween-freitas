type GuestType = {
    id: string
    name: string
    email: string
    photo: string
    alreadyVoted?: boolean
}

type PollOption = {
    votes: number
} & GuestType

type PollType = {
    id: string
    title: string
    options?: PollOption[]
    totalVotes: number
    createdAt: string
}

type PollResult = {
    sortedOptions: PollOption[];
    champion: PollOption;
};
