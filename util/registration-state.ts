export function getRegistrationState(
  event: HalloweenEvent,
  now = new Date(),
): RegistrationState {
  if (event.status !== "active") return "closed";
  if (event.votingStatus !== "not_started") return "closed";
  const time = now.getTime();
  if (time < new Date(event.registrationStartsAt).getTime()) return "upcoming";
  return "open";
}
