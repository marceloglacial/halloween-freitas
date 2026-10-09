type Vote = { categoryId: string };

interface VoteGridProps {
  users: VotingCandidate[];
  categoryId: string;
  eventId: string;
}
