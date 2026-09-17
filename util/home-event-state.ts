export type HomeEventState =
  "pre_event" | "voting_soon" | "voting_open" | "voting_ended" | "post_event";

export function getHomeEventState(
  event: HalloweenEvent | null,
  now = new Date(),
): HomeEventState {
  if (!event || event.status === "archived") return "post_event";
  if (event.votingStatus === "ended" && event.resultsPublished) {
    return "post_event";
  }
  if (now.getTime() < new Date(event.startsAt).getTime()) return "pre_event";
  if (event.votingStatus === "open") return "voting_open";
  if (event.votingStatus === "ended") return "voting_ended";
  return "voting_soon";
}
