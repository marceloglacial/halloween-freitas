type Vote = { categoryId: string };

interface VoteGridProps {
  users: VotingCandidate[];
  categoryId: string;
  roundId: string;
  eventId: string;
}
