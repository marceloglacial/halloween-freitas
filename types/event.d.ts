type EventStatus = "active" | "archived";
type VotingStatus = "not_started" | "open" | "ended";
type RegistrationState = "upcoming" | "open" | "closed";
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
  votingStatus: VotingStatus;
  resultsPublished: boolean;
  status: EventStatus;
};
