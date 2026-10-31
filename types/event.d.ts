type EventStatus = "active" | "archived";
type VotingStatus = "not_started" | "open" | "ended";
type ContestEntryStatus = "open" | "closed";
type RegistrationState = "upcoming" | "open" | "closed";
type ContestEntryState = "upcoming" | "open" | "closed";
type EventPhase =
  | "upcoming"
  | "registration"
  | "voting"
  | "awaiting-results"
  | "results"
  | "archived";

type HalloweenEvent = {
  _id: string;
  year: number;
  slug: string;
  title: string;
  timezone: string;
  registrationStartsAt: string;
  eventStartsAt: string;
  contestEntryStatus?: ContestEntryStatus;
  votingStatus: VotingStatus;
  resultsPublished: boolean;
  status: EventStatus;
};
