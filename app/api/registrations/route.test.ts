import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentEvent: vi.fn(),
  getRegistrationState: vi.fn(),
  getDb: vi.fn(),
}));

vi.mock("@/lib/events", () => ({
  getCurrentEvent: mocks.getCurrentEvent,
  getRegistrationState: mocks.getRegistrationState,
}));
vi.mock("@/lib/db", () => ({ getDb: mocks.getDb }));

import { POST } from "@/app/api/registrations/route";

function registrationRequest() {
  return new Request("http://localhost/api/registrations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName: "Guest User",
      email: "guest@example.com",
    }),
  });
}

describe("registration API window", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getCurrentEvent.mockResolvedValue({ _id: "event-id" });
  });

  it("rejects registration before the configured opening", async () => {
    mocks.getRegistrationState.mockReturnValue("upcoming");
    const response = await POST(registrationRequest());
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "As inscrições ainda não estão abertas",
    });
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it("rejects registration at or after the configured closing", async () => {
    mocks.getRegistrationState.mockReturnValue("closed");
    const response = await POST(registrationRequest());
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "As inscrições estão encerradas",
    });
    expect(mocks.getDb).not.toHaveBeenCalled();
  });
});
