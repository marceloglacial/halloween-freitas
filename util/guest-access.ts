const objectIdPattern = /^[a-f\d]{24}$/i;

export function guestReturnPath(value: unknown, eventId: string) {
  let pathname = "/votacao/categories";
  if (
    typeof value === "string" &&
    /^\/votacao\/categories(?:\/[a-f\d]{24})?(?:\?[^#\\]*)?$/i.test(value)
  ) {
    pathname = value.split("?")[0];
  }
  return `${pathname}?${new URLSearchParams({ eventId })}`;
}

export function validGuestEventId(value: unknown): value is string {
  return typeof value === "string" && objectIdPattern.test(value);
}

export function guestAccessUrl(eventId: string, returnTo?: string) {
  return `/acesso?${new URLSearchParams({ eventId, returnTo: guestReturnPath(returnTo, eventId) })}`;
}
