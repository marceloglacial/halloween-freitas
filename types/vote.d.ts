type Vote = { categoryId: string };

interface VoteGridProps {
  users: PublicUser[];
  categoryId: string;
  eventId: string;
}
