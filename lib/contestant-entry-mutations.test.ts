import { describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";
import {
  createGroupContestantEntry,
  createIndividualContestantEntry,
  updateIndividualContestantEntryTitle,
} from "@/lib/contestant-entry-mutations";

const eventId = new ObjectId("507f1f77bcf86cd799439011");
const categoryId = new ObjectId("507f1f77bcf86cd799439012");
const rsvpId = new ObjectId("507f1f77bcf86cd799439013");
const entryId = new ObjectId("507f1f77bcf86cd799439014");
const now = new Date("2026-09-15T00:00:00.000Z");

function fixture({
  eventMatched = 1,
  rsvp = { _id: rsvpId } as { _id: ObjectId } | null,
  category = { _id: categoryId, eligibility: "all" } as {
    _id: ObjectId;
    eligibility: string;
  } | null,
  entry = { _id: entryId, status: "draft" } as {
    _id: ObjectId;
    status: string;
  } | null,
}: {
  eventMatched?: number;
  rsvp?: { _id: ObjectId } | null;
  category?: { _id: ObjectId; eligibility: string } | null;
  entry?: { _id: ObjectId; status: string } | null;
} = {}) {
  const eventUpdate = vi.fn().mockResolvedValue({ matchedCount: eventMatched });
  const rsvpFind = vi.fn().mockResolvedValue(rsvp);
  const categoryFind = vi.fn().mockReturnValue({
    toArray: vi.fn().mockResolvedValue(category ? [category] : []),
  });
  const categoryFindOne = vi.fn().mockResolvedValue(category);
  const entryFind = vi.fn().mockResolvedValue(entry);
  const insert = vi.fn().mockResolvedValue({ insertedId: entryId });
  const update = vi.fn().mockResolvedValue({ matchedCount: 1 });
  const db = {
    collection: (name: string) => {
      if (name === "events") return { updateOne: eventUpdate };
      if (name === "users") return { findOne: rsvpFind };
      if (name === "categories")
        return { find: categoryFind, findOne: categoryFindOne };
      if (name === "contestants") {
        return { insertOne: insert, findOne: entryFind, updateOne: update };
      }
      throw new Error(`Unexpected collection: ${name}`);
    },
  };
  const session = {
    withTransaction: async (work: () => Promise<unknown>) => work(),
    endSession: vi.fn(),
  };
  const client = { startSession: () => session };
  return {
    db: db as never,
    client: client as never,
    session,
    eventUpdate,
    rsvpFind,
    categoryFind,
    categoryFindOne,
    entryFind,
    insert,
    update,
  };
}

describe("individual contestant entry mutations", () => {
  it("creates a canonical draft from the same-event RSVP and all-eligible category", async () => {
    const f = fixture();

    const created = await createIndividualContestantEntry(f.client, f.db, {
      eventId,
      categoryId,
      rsvpId,
      displayName: "Ana Freitas",
      costumeTitle: "Bruxa",
      now,
    });

    expect(created).toMatchObject({
      eventId,
      categoryId,
      ownerRsvpId: rsvpId,
      entryType: "individual",
      displayName: "Ana Freitas",
      costumeTitle: "Bruxa",
      status: "draft",
      createdAt: now,
      updatedAt: now,
    });
    expect(f.eventUpdate).toHaveBeenCalledOnce();
    expect(f.rsvpFind).toHaveBeenCalledWith(
      { _id: rsvpId, eventId, status: { $ne: "cancelled" } },
      expect.objectContaining({ session: f.session }),
    );
    expect(f.categoryFind).toHaveBeenCalledWith(
      { eventId },
      expect.objectContaining({ session: f.session }),
    );
    expect(f.insert).toHaveBeenCalledWith(created, { session: f.session });
    expect(f.session.endSession).toHaveBeenCalledOnce();
  });

  it("does not create an entry if the event cutoff guard loses the race", async () => {
    const f = fixture({ eventMatched: 0 });

    await expect(
      createIndividualContestantEntry(f.client, f.db, {
        eventId,
        categoryId,
        rsvpId,
        displayName: "Ana Freitas",
        now,
      }),
    ).rejects.toThrow("CONTEST_ENTRY_CLOSED");
    expect(f.rsvpFind).not.toHaveBeenCalled();
    expect(f.insert).not.toHaveBeenCalled();
    expect(f.session.endSession).toHaveBeenCalledOnce();
  });

  it("does not create an entry for a category outside the edition or individual eligibility", async () => {
    const missingCategory = fixture({ category: null });
    await expect(
      createIndividualContestantEntry(
        missingCategory.client,
        missingCategory.db,
        { eventId, categoryId, rsvpId, displayName: "Ana", now },
      ),
    ).rejects.toMatchObject({ status: 400, code: "category_not_available" });
    expect(missingCategory.insert).not.toHaveBeenCalled();

    const restrictedCategory = fixture({
      category: { _id: categoryId, eligibility: "group" },
    });
    await expect(
      createIndividualContestantEntry(
        restrictedCategory.client,
        restrictedCategory.db,
        { eventId, categoryId, rsvpId, displayName: "Ana", now },
      ),
    ).rejects.toMatchObject({ status: 400, code: "category_not_available" });
    expect(restrictedCategory.insert).not.toHaveBeenCalled();
  });

  it("updates only an owned individual entry title within the selected event", async () => {
    const f = fixture();

    await expect(
      updateIndividualContestantEntryTitle(f.client, f.db, {
        eventId,
        entryId,
        rsvpId,
        costumeTitle: "  Bruxa   das abóboras ",
        now,
      }),
    ).resolves.toEqual({ costumeTitle: "Bruxa das abóboras" });
    expect(f.entryFind).toHaveBeenCalledWith(
      { _id: entryId, eventId, ownerRsvpId: rsvpId, entryType: "individual" },
      expect.objectContaining({ session: f.session }),
    );
    expect(f.update).toHaveBeenCalledWith(
      {
        _id: entryId,
        eventId,
        ownerRsvpId: rsvpId,
        entryType: "individual",
        status: { $in: ["draft", "ready"] },
      },
      { $set: { costumeTitle: "Bruxa das abóboras", updatedAt: now } },
      { session: f.session },
    );
  });

  it("rejects title edits for locked, withdrawn, or unowned entries", async () => {
    for (const entry of [
      { _id: entryId, status: "locked" },
      { _id: entryId, status: "withdrawn" },
      null,
    ]) {
      const f = fixture({ entry });
      await expect(
        updateIndividualContestantEntryTitle(f.client, f.db, {
          eventId,
          entryId,
          rsvpId,
          costumeTitle: "Bruxa",
          now,
        }),
      ).rejects.toMatchObject({ status: entry ? 409 : 404 });
      expect(f.update).not.toHaveBeenCalled();
    }
  });
});

describe("group contestant entry mutations", () => {
  it("creates a private creator-owned draft in a group category", async () => {
    const f = fixture({
      category: { _id: categoryId, eligibility: "group" },
    });

    const created = await createGroupContestantEntry(f.client, f.db, {
      eventId,
      categoryId,
      ownerRsvpId: rsvpId,
      groupName: "  Família   Freitas ",
      costumeTitle: "  Família Addams ",
      now,
    });

    expect(created).toMatchObject({
      eventId,
      categoryId,
      ownerRsvpId: rsvpId,
      entryType: "group",
      displayName: "Família Freitas",
      costumeTitle: "Família Addams",
      status: "draft",
      createdAt: now,
      updatedAt: now,
    });
    expect(created).not.toHaveProperty("guardianRsvpId");
    expect(f.rsvpFind).toHaveBeenCalledWith(
      { _id: rsvpId, eventId, status: { $ne: "cancelled" } },
      expect.objectContaining({ session: f.session }),
    );
    expect(f.categoryFindOne).toHaveBeenCalledWith(
      { _id: categoryId, eventId },
      expect.objectContaining({ session: f.session }),
    );
    expect(f.insert).toHaveBeenCalledWith(created, { session: f.session });
    expect(f.session.endSession).toHaveBeenCalledOnce();
  });

  it("requires a group-eligible category and same-edition creator RSVP", async () => {
    const wrongCategory = fixture();
    await expect(
      createGroupContestantEntry(wrongCategory.client, wrongCategory.db, {
        eventId,
        categoryId,
        ownerRsvpId: rsvpId,
        groupName: "Família Freitas",
        now,
      }),
    ).rejects.toMatchObject({ status: 400, code: "category_not_available" });
    expect(wrongCategory.insert).not.toHaveBeenCalled();

    const wrongEventRsvp = fixture({
      category: { _id: categoryId, eligibility: "group" },
      rsvp: null,
    });
    await expect(
      createGroupContestantEntry(wrongEventRsvp.client, wrongEventRsvp.db, {
        eventId,
        categoryId,
        ownerRsvpId: rsvpId,
        groupName: "Família Freitas",
        now,
      }),
    ).rejects.toThrow("CONTESTANT_RSVP_NOT_FOUND_FOR_EVENT");
    expect(wrongEventRsvp.insert).not.toHaveBeenCalled();
  });

  it("does not create a group draft after the enrollment cutoff wins", async () => {
    const f = fixture({
      eventMatched: 0,
      category: { _id: categoryId, eligibility: "group" },
    });

    await expect(
      createGroupContestantEntry(f.client, f.db, {
        eventId,
        categoryId,
        ownerRsvpId: rsvpId,
        groupName: "Família Freitas",
        now,
      }),
    ).rejects.toThrow("CONTEST_ENTRY_CLOSED");
    expect(f.rsvpFind).not.toHaveBeenCalled();
    expect(f.insert).not.toHaveBeenCalled();
  });
});
