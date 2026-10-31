export function getContestEntryState(
  event: Pick<
    HalloweenEvent,
    "registrationStartsAt" | "status" | "votingStatus" | "contestEntryStatus"
  >,
  now = new Date(),
): ContestEntryState {
  if (
    event.status !== "active" ||
    event.votingStatus !== "not_started" ||
    event.contestEntryStatus === "closed"
  ) {
    return "closed";
  }

  if (now.getTime() < new Date(event.registrationStartsAt).getTime()) {
    return "upcoming";
  }

  return "open";
}
