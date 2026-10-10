import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isAdmin: vi.fn(),
  auth: vi.fn(),
  getEventById: vi.fn(),
  getAdminUsersForEvent: vi.fn(),
  getMongoClient: vi.fn(),
  updateOne: vi.fn(),
  eventUpdateOne: vi.fn(),
  insertOne: vi.fn(),
  deleteOne: vi.fn(),
  findOne: vi.fn(),
  userFindOne: vi.fn(),
  auditInsertOne: vi.fn(),
  withTransaction: vi.fn(),
  endSession: vi.fn(),
}));

vi.mock("@/lib/auth/admin", () => ({ isAdmin: mocks.isAdmin }));
vi.mock("@clerk/nextjs/server", () => ({ auth: mocks.auth }));
vi.mock("@/lib/events", () => ({ getEventById: mocks.getEventById }));
vi.mock("@/lib/db", () => ({
  getDb: vi.fn(async () => ({
    collection: (name: string) =>
      name === "events"
        ? { updateOne: mocks.eventUpdateOne }
        : name === "votes"
          ? { findOne: mocks.findOne }
          : name === "adminAudits"
            ? { insertOne: mocks.auditInsertOne }
            : {
                insertOne: mocks.insertOne,
                updateOne: mocks.updateOne,
                deleteOne: mocks.deleteOne,
                findOne: mocks.userFindOne,
              },
  })),
  getMongoClient: mocks.getMongoClient,
}));
vi.mock("@/lib/users", () => ({
  getAdminUsersForEvent: mocks.getAdminUsersForEvent,
}));

import { DELETE, GET, POST, PUT } from "@/app/api/admin/users/route";

const eventId = "507f1f77bcf86cd799439011";

describe("admin users API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.eventUpdateOne.mockResolvedValue({ matchedCount: 1 });
    mocks.insertOne.mockResolvedValue({
      insertedId: { toString: () => "new-user" },
    });
    mocks.updateOne.mockResolvedValue({ matchedCount: 1 });
    mocks.deleteOne.mockResolvedValue({ deletedCount: 1 });
    mocks.findOne.mockResolvedValue(null);
    mocks.withTransaction.mockImplementation(
      async (operation: () => Promise<unknown>) => operation(),
    );
    mocks.getMongoClient.mockResolvedValue({
      startSession: () => ({
        withTransaction: mocks.withTransaction,
        endSession: mocks.endSession,
      }),
    });
    mocks.getEventById.mockResolvedValue({
      _id: eventId,
      status: "active",
      votingStatus: "not_started",
      registrationStartsAt: "2026-09-01T04:00:00.000Z",
      contestEntryStatus: "open",
    });
    mocks.auth.mockResolvedValue({ userId: "admin_user" });
    mocks.userFindOne.mockResolvedValue({
      _id: "507f1f77bcf86cd799439012",
      eventId,
      fullName: "Nome anterior",
      email: "old@example.com",
      normalizedEmail: "old@example.com",
      contestantName: "Nome anterior",
      contestant: true,
      group: false,
      junior: false,
      clerkUserId: "linked_owner",
    });
  });

  it("rejects non-admin requests", async () => {
    mocks.isAdmin.mockResolvedValue(false);
    const response = await GET(
      new Request(`http://localhost/api/admin/users?eventId=${eventId}`),
    );
    expect(response.status).toBe(401);
  });

  it("requires an explicit valid event", async () => {
    mocks.isAdmin.mockResolvedValue(true);
    const response = await GET(new Request("http://localhost/api/admin/users"));
    expect(response.status).toBe(400);
    expect(mocks.getAdminUsersForEvent).not.toHaveBeenCalled();
  });

  it("loads users only for the selected event", async () => {
    mocks.isAdmin.mockResolvedValue(true);
    mocks.getEventById.mockResolvedValue({ _id: eventId });
    mocks.getAdminUsersForEvent.mockResolvedValue([{ _id: "user" }]);
    const response = await GET(
      new Request(`http://localhost/api/admin/users?eventId=${eventId}`),
    );
    expect(response.status).toBe(200);
    expect(mocks.getEventById).toHaveBeenCalledWith(eventId);
    expect(mocks.getAdminUsersForEvent).toHaveBeenCalledWith(eventId);
  });

  it("audits existing RSVP corrections after cutoff without changing stable ownership", async () => {
    mocks.isAdmin.mockResolvedValue(true);
    mocks.getEventById.mockResolvedValue({
      _id: eventId,
      status: "archived",
      votingStatus: "ended",
      contestEntryStatus: "closed",
    });
    mocks.updateOne.mockResolvedValue({ matchedCount: 1 });
    const response = await PUT(
      new Request("http://localhost/api/admin/users", {
        method: "PUT",
        body: JSON.stringify({
          eventId,
          _id: "507f1f77bcf86cd799439012",
          fullName: "Nome escolhido",
          email: "new@example.com",
          clerkUserId: "forged_owner",
        }),
      }),
    );
    expect(response.status).toBe(200);
    const update = mocks.updateOne.mock.calls[0][1];
    expect(update.$set).toMatchObject({
      fullName: "Nome escolhido",
      normalizedEmail: "new@example.com",
    });
    expect(update.$set).not.toHaveProperty("clerkUserId");
    expect(update).not.toHaveProperty("$unset");
    expect(mocks.eventUpdateOne).not.toHaveBeenCalled();
    expect(mocks.auditInsertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: expect.anything(),
        clerkUserId: "admin_user",
        action: "guest_record_corrected",
        targetType: "rsvp",
        targetId: expect.anything(),
        changes: { fields: expect.arrayContaining(["fullName", "email"]) },
      }),
      { session: expect.any(Object) },
    );
  });

  it("rejects non-admin RSVP corrections before reading or changing records", async () => {
    mocks.auth.mockResolvedValue({ userId: "guest_user" });
    mocks.isAdmin.mockResolvedValue(false);

    const response = await PUT(
      new Request("http://localhost/api/admin/users", {
        method: "PUT",
        body: JSON.stringify({
          eventId,
          _id: "507f1f77bcf86cd799439012",
          fullName: "Nome alterado",
          email: "guest@example.com",
        }),
      }),
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Não autorizado" });
    expect(mocks.auth).toHaveBeenCalledOnce();
    expect(mocks.isAdmin).toHaveBeenCalledWith("guest_user");
    expect(mocks.getEventById).not.toHaveBeenCalled();
    expect(mocks.getMongoClient).not.toHaveBeenCalled();
    expect(mocks.userFindOne).not.toHaveBeenCalled();
    expect(mocks.updateOne).not.toHaveBeenCalled();
    expect(mocks.auditInsertOne).not.toHaveBeenCalled();
  });

  it("creates contestant records only while scheduled entry is open", async () => {
    mocks.isAdmin.mockResolvedValue(true);
    mocks.getEventById.mockResolvedValue({ _id: eventId });
    const response = await POST(
      new Request("http://localhost/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          fullName: "Guest User",
          email: "guest@example.com",
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(mocks.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({ contestant: true, eventId: expect.anything() }),
      { session: expect.any(Object) },
    );
    expect(mocks.withTransaction).toHaveBeenCalledOnce();
    expect(mocks.endSession).toHaveBeenCalledOnce();
  });

  it("rejects a contestant write if the atomic event guard observes a closed entry", async () => {
    mocks.isAdmin.mockResolvedValue(true);
    mocks.getEventById.mockResolvedValue({ _id: eventId });
    mocks.eventUpdateOne.mockResolvedValue({ matchedCount: 0 });
    const response = await POST(
      new Request("http://localhost/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          fullName: "Guest User",
          email: "guest@example.com",
        }),
      }),
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "As inscrições do concurso estão encerradas",
    });
    expect(mocks.insertOne).not.toHaveBeenCalled();
    expect(mocks.withTransaction).toHaveBeenCalledOnce();
  });

  it("does not audit when an existing RSVP is unchanged", async () => {
    mocks.isAdmin.mockResolvedValue(true);
    mocks.userFindOne.mockResolvedValue({
      _id: "507f1f77bcf86cd799439012",
      eventId,
      fullName: "Nome escolhido",
      email: "new@example.com",
      normalizedEmail: "new@example.com",
      contestantName: "Nome escolhido",
      imageUrl: null,
      group: false,
      junior: false,
    });
    const response = await PUT(
      new Request("http://localhost/api/admin/users", {
        method: "PUT",
        body: JSON.stringify({
          eventId,
          _id: "507f1f77bcf86cd799439012",
          fullName: "Nome escolhido",
          email: "new@example.com",
        }),
      }),
    );
    expect(response.status).toBe(200);
    expect(mocks.auditInsertOne).not.toHaveBeenCalled();
  });

  it("keeps deletion inside the event-entry transaction and vote check", async () => {
    mocks.isAdmin.mockResolvedValue(true);
    mocks.getEventById.mockResolvedValue({ _id: eventId });
    const response = await DELETE(
      new Request("http://localhost/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          _id: "507f1f77bcf86cd799439012",
        }),
      }),
    );

    expect(response.status).toBe(204);
    expect(mocks.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ eventId: expect.anything() }),
      { session: expect.any(Object) },
    );
    expect(mocks.deleteOne).toHaveBeenCalledWith(
      expect.objectContaining({ eventId: expect.anything() }),
      { session: expect.any(Object) },
    );
  });

  it("does not delete a contestant if voting or entry closure wins the race", async () => {
    mocks.isAdmin.mockResolvedValue(true);
    mocks.getEventById.mockResolvedValue({ _id: eventId });
    mocks.eventUpdateOne.mockResolvedValue({ matchedCount: 0 });
    const response = await DELETE(
      new Request("http://localhost/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          _id: "507f1f77bcf86cd799439012",
        }),
      }),
    );

    expect(response.status).toBe(409);
    expect(mocks.findOne).not.toHaveBeenCalled();
    expect(mocks.deleteOne).not.toHaveBeenCalled();
  });
});
