export type AdminEventSummary = Pick<
  HalloweenEvent,
  "year" | "title" | "status"
>;

export type AdminEventSelection = {
  event: AdminEventSummary | null;
  reason:
    | "selected"
    | "active-fallback"
    | "latest-fallback"
    | "invalid-year"
    | "no-events";
};

export function resolveAdminEvent(
  events: AdminEventSummary[],
  requestedYear?: string | number,
): AdminEventSelection {
  if (events.length === 0) return { event: null, reason: "no-events" };

  const latest = events.reduce((newest, event) =>
    event.year > newest.year ? event : newest,
  );

  if (requestedYear !== undefined && requestedYear !== "") {
    const year = Number(requestedYear);
    const exact = Number.isInteger(year)
      ? events.find((event) => event.year === year)
      : undefined;
    if (exact) return { event: exact, reason: "selected" };

    return {
      event: events.find((event) => event.status === "active") ?? latest,
      reason: "invalid-year",
    };
  }

  const active = events.find((event) => event.status === "active");
  return active
    ? { event: active, reason: "active-fallback" }
    : { event: latest, reason: "latest-fallback" };
}
