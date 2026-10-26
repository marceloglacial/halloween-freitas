export function getRegistrationState(
  event: HalloweenEvent,
  now = new Date(),
): RegistrationState {
  if (
    event.status !== "active" ||
    event.votingStatus !== "not_started" ||
    event.contestEntryStatus === "closed"
  ) {
    return "closed";
  }
  const time = now.getTime();
  if (time < new Date(event.registrationStartsAt).getTime()) return "upcoming";
  return "open";
}
