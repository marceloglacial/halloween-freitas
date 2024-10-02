export function getPollResults(poll: PollType): PollResult {
    if (!poll.options) {
        return {
            sortedOptions: [],
            champion: {
                name: 'Ninguém',
                id: '',
                email: '',
                photo: '',
                votes: 0,
            },
        }
    }

    // Sort options by votes descending, and by name in case of a tie
    const sortedOptions = poll.options.sort((a, b) => {
        if (b.votes !== a.votes) {
            return b.votes - a.votes // Sort by votes (descending)
        }
        return a.name.localeCompare(b.name) // Sort by name if votes are tied
    })

    // Get top vote count
    const topVoteCount = sortedOptions[0]?.votes ?? 0
    const topVoted = sortedOptions.filter((option) => option.votes === topVoteCount)

    let champion

    if (topVoted.length === 1) {
        champion = topVoted[0] // Single champion
    } else {
        // Return all champions in case of a tie
        champion = {
            name: 'Empate',
            id: '',
            email: '',
            photo: '',
            votes: 0,
        }
    }

    return { sortedOptions, champion }
}
