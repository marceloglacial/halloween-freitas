type EventStatus = "active" | "archived";
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
  startsAt: string;
  registrationOpensAt: string;
  registrationClosesAt: string;
  votingOpensAt: string;
  votingClosesAt: string;
  resultsPublishedAt: string;
  status: EventStatus;
};
