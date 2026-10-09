import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isAdmin: vi.fn(),
  getDb: vi.fn(),
  getEventById: vi.fn(),
  updateOne: vi.fn(),
}));

vi.mock("@/lib/auth/admin", () => ({ isAdmin: mocks.isAdmin }));
vi.mock("@/lib/db", () => ({ getDb: mocks.getDb }));
vi.mock("@/lib/events", () => ({ getEventById: mocks.getEventById }));

import { GET, PUT } from "@/app/api/admin/events/[id]/route";

const eventId = "507f1f77bcf86cd799439011";
const event: HalloweenEvent = {
  _id: eventId,
  year: 2026,
  slug: "halloween-2026",
  title: "Halloween 2026",
  timezone: "America/Toronto",
  registrationStartsAt: "2026-09-01T04:00:00.000Z",
  eventStartsAt: "2026-11-01T00:00:00.000Z",
  votingStatus: "not_started",
  resultsPublished: false,
  status: "archived",
};

const params = { params: Promise.resolve({ id: eventId }) };

describe("admin event item API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.isAdmin.mockResolvedValue(true);
    mocks.getEventById.mockResolvedValue(event);
    mocks.updateOne.mockResolvedValue({ matchedCount: 1 });
    mocks.getDb.mockResolvedValue({
      collection: () => ({ updateOne: mocks.updateOne }),
    });
  });

  it("requires administrator access before reading an event", async () => {
    mocks.isAdmin.mockResolvedValue(false);
    const response = await GET(new Request("http://localhost"), params);
    expect(response.status).toBe(401);
    expect(mocks.getEventById).not.toHaveBeenCalled();
  });

  it("reads a single event for an administrator", async () => {
    const response = await GET(new Request("http://localhost"), params);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(event);
    expect(mocks.getEventById).toHaveBeenCalledWith(eventId);
  });

  it("returns not found for an unknown event", async () => {
    mocks.getEventById.mockResolvedValue(null);
    const response = await GET(new Request("http://localhost"), params);
    expect(response.status).toBe(404);
  });

  it("persists updated schedule values as Date instances", async () => {
    const response = await PUT(
      new Request("http://localhost", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: event.year,
          title: event.title,
          timezone: event.timezone,
          registrationStartsAt: "2026-09-01T00:00",
          eventStartsAt: "2026-10-31T20:00",
        }),
      }),
      params,
    );

    expect(response.status).toBe(200);
    const update = mocks.updateOne.mock.calls[0][1].$set;
    expect(update.registrationStartsAt).toEqual(
      new Date("2026-09-01T04:00:00.000Z"),
    );
    expect(update.eventStartsAt).toEqual(new Date("2026-11-01T00:00:00.000Z"));
    expect(update).not.toHaveProperty("startsAt");
  });

  it("rejects an event starting before registration without updating the event", async () => {
    const response = await PUT(
      new Request("http://localhost", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: event.year,
          title: event.title,
          timezone: event.timezone,
          registrationStartsAt: "2026-10-31T20:01",
          eventStartsAt: "2026-10-31T20:00",
        }),
      }),
      params,
    );

    expect(response.status).toBe(400);
    expect(mocks.getDb).not.toHaveBeenCalled();
    expect(mocks.updateOne).not.toHaveBeenCalled();
  });

  it("rejects a change to the immutable event year", async () => {
    const response = await PUT(
      new Request("http://localhost", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: 2027,
          title: event.title,
          timezone: event.timezone,
          registrationStartsAt: "2027-09-01T00:00",
          eventStartsAt: "2027-10-31T20:00",
        }),
      }),
      params,
    );
    expect(response.status).toBe(400);
    expect(mocks.updateOne).not.toHaveBeenCalled();
  });
});
