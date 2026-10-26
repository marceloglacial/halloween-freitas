import { describe, expect, it, vi } from "vitest";
import { ObjectId, type Db } from "mongodb";
import {
  contestantEntriesForRsvpQuery,
  contestantOwnership,
  createContestantEntry,
  getAdminContestantEntriesForEvent,
  getContestantEntriesForRsvp,
  getVotingCandidatesForCategory,
  isContestantEntryType,
  requireContestantRsvpInEvent,
  serializePublicContestantEntry,
} from "@/lib/contestant-entries";

const eventId = new ObjectId("507f1f77bcf86cd799439011");
const categoryId = new ObjectId("507f1f77bcf86cd799439012");
const rsvpId = new ObjectId("507f1f77bcf86cd799439013");
const dbMocks = vi.hoisted(() => ({
  find: vi.fn(),
  findOne: vi.fn(),
  sort: vi.fn(),
  toArray: vi.fn(),
  getCategories: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  getDb: vi.fn(async () => ({
    collection: (name: string) =>
      name === "categories"
        ? { findOne: dbMocks.findOne }
        : { find: dbMocks.find },
  })),
}));
vi.mock("@/lib/contestant-photos", () => ({
  contestPhotoPreviewUrl: vi.fn(() => "https://private.example/temporary"),
}));
vi.mock("@/util/get-categories", () => ({
  getCategories: dbMocks.getCategories,
}));

describe("contestant entry schema and ownership", () => {
  it("accepts only the canonical contestant entry types", () => {
    expect(isContestantEntryType("individual")).toBe(true);
    expect(isContestantEntryType("junior")).toBe(false);
    expect(isContestantEntryType("group")).toBe(true);
    expect(isContestantEntryType("adult")).toBe(false);
  });

  it("assigns adult RSVP ownership to individual and group entries", () => {
    for (const entryType of ["individual", "group"] as const) {
      expect(contestantOwnership(entryType, rsvpId.toString())).toEqual({
        ownerRsvpId: rsvpId,
      });
    }
  });

  it("creates new entries as drafts with stable IDs and normalized names", () => {
    const now = new Date("2026-10-09T12:00:00.000Z");
    const entry = createContestantEntry(
      {
        eventId: eventId.toString(),
        categoryId: categoryId.toString(),
        entryType: "individual",
        rsvpId: rsvpId.toString(),
        displayName: "  Ana   Freitas ",
      },
      now,
    );

    expect(entry).toMatchObject({
      eventId,
      categoryId,
      entryType: "individual",
      ownerRsvpId: rsvpId,
      displayName: "Ana Freitas",
      status: "draft",
      createdAt: now,
      updatedAt: now,
    });
    expect(entry._id).toBeInstanceOf(ObjectId);
    expect(entry).not.toHaveProperty("guardianRsvpId");
  });

  it("rejects malformed IDs, names, and entry types", () => {
    expect(() =>
      createContestantEntry({
        eventId: "bad",
        categoryId: categoryId.toString(),
        entryType: "individual",
        rsvpId: rsvpId.toString(),
        displayName: "Ana",
      }),
    ).toThrow("INVALID_CONTESTANT_ENTRY");
    expect(() =>
      createContestantEntry({
        eventId: eventId.toString(),
        categoryId: categoryId.toString(),
        entryType: "unknown",
        rsvpId: rsvpId.toString(),
        displayName: "Ana",
      }),
    ).toThrow("INVALID_CONTESTANT_ENTRY");
    expect(() => contestantOwnership("individual", "bad")).toThrow(
      "INVALID_CONTESTANT_OWNER",
    );
  });

  it("scopes owner lookups to the selected event", () => {
    expect(
      contestantEntriesForRsvpQuery(eventId.toString(), rsvpId.toString()),
    ).toEqual({
      eventId,
      ownerRsvpId: rsvpId,
    });
    expect(() => contestantEntriesForRsvpQuery("bad", rsvpId)).toThrow(
      "INVALID_CONTESTANT_OWNERSHIP_QUERY",
    );
  });

  it("requires an active RSVP reference from the same event", async () => {
    const findOne = vi.fn().mockResolvedValue({ _id: rsvpId });
    const db = {
      collection: vi.fn(() => ({ findOne })),
    } as unknown as Db;

    await expect(
      requireContestantRsvpInEvent(db, eventId.toString(), rsvpId.toString()),
    ).resolves.toEqual(rsvpId);
    expect(findOne).toHaveBeenCalledWith(
      {
        _id: rsvpId,
        eventId,
        status: { $ne: "cancelled" },
      },
      { projection: { _id: 1 } },
    );

    findOne.mockResolvedValue(null);
    await expect(
      requireContestantRsvpInEvent(db, eventId.toString(), rsvpId.toString()),
    ).rejects.toThrow("CONTESTANT_RSVP_NOT_FOUND_FOR_EVENT");
  });

  it("loads only the selected guest's event entries and omits ownership fields", async () => {
    dbMocks.find.mockReturnValue({ sort: dbMocks.sort });
    dbMocks.sort.mockReturnValue({ toArray: dbMocks.toArray });
    dbMocks.toArray.mockResolvedValue([
      {
        _id: new ObjectId("507f1f77bcf86cd799439014"),
        eventId,
        categoryId,
        entryType: "individual",
        displayName: "Ana",
        status: "ready",
        ownerRsvpId: rsvpId,
        privateField: "must not be serialized",
      },
    ]);

    await expect(
      getContestantEntriesForRsvp(eventId.toString(), rsvpId.toString()),
    ).resolves.toEqual([
      {
        _id: "507f1f77bcf86cd799439014",
        categoryId: categoryId.toString(),
        entryType: "individual",
        displayName: "Ana",
        status: "ready",
      },
    ]);
    expect(dbMocks.find).toHaveBeenCalledWith(
      {
        eventId,
        ownerRsvpId: rsvpId,
      },
      {
        projection: {
          _id: 1,
          categoryId: 1,
          costumeTitle: 1,
          entryType: 1,
          displayName: 1,
          status: 1,
          contestPhoto: 1,
        },
      },
    );
    expect(dbMocks.sort).toHaveBeenCalledWith({ createdAt: 1, _id: 1 });
  });

  it("lists admin contestant entries only for the edition and omits private ownership and asset fields", async () => {
    const secondCategoryId = new ObjectId("507f1f77bcf86cd799439017");
    const entries = {
      toArray: vi.fn().mockResolvedValue([
        {
          _id: new ObjectId("507f1f77bcf86cd799439018"),
          eventId,
          categoryId: secondCategoryId,
          entryType: "group",
          displayName: "Freitas",
          costumeTitle: "Vampiros",
          status: "ready",
          ownerRsvpId: rsvpId,
          contestPhoto: {
            assetId: "private-asset",
            publicId: "private-cloudinary-id",
            consentAt: new Date("2026-10-01T00:00:00.000Z"),
            consentByRsvpId: rsvpId.toString(),
          },
          createdAt: new Date("2026-10-02T00:00:00.000Z"),
        },
        {
          _id: new ObjectId("507f1f77bcf86cd799439019"),
          eventId,
          categoryId,
          entryType: "individual",
          displayName: "Ana",
          status: "draft",
          ownerRsvpId: rsvpId,
          createdAt: new Date("2026-10-03T00:00:00.000Z"),
        },
      ]),
    };
    dbMocks.find.mockReturnValue(entries);
    dbMocks.getCategories.mockResolvedValue([
      {
        _id: secondCategoryId.toString(),
        eventId: eventId.toString(),
        title: "Grupo",
        icon: "👯",
        order: 1,
        eligibility: "group",
      },
      {
        _id: categoryId.toString(),
        eventId: eventId.toString(),
        title: "Individual",
        icon: "🎃",
        order: 0,
        eligibility: "all",
      },
    ]);

    const entriesForAdmin = await getAdminContestantEntriesForEvent(
      eventId.toString(),
    );

    expect(entriesForAdmin.map((entry) => entry.displayName)).toEqual([
      "Ana",
      "Freitas",
    ]);
    expect(entriesForAdmin[0]).toMatchObject({
      categoryTitle: "Individual",
      status: "draft",
      hasPhoto: false,
    });
    expect(entriesForAdmin[1]).toMatchObject({
      categoryTitle: "Grupo",
      status: "ready",
      hasPhoto: true,
    });
    expect(dbMocks.find).toHaveBeenCalledWith(
      { eventId },
      {
        projection: {
          _id: 1,
          categoryId: 1,
          entryType: 1,
          displayName: 1,
          costumeTitle: 1,
          status: 1,
          contestPhoto: 1,
          createdAt: 1,
        },
      },
    );
    expect(JSON.stringify(entriesForAdmin)).not.toContain("ownerRsvpId");
    expect(JSON.stringify(entriesForAdmin)).not.toContain("private-asset");
    expect(JSON.stringify(entriesForAdmin)).not.toContain(
      "private-cloudinary-id",
    );
  });

  it("keeps drafts and withdrawn entries out of public candidate output", () => {
    const entry = createContestantEntry({
      eventId: eventId.toString(),
      categoryId: categoryId.toString(),
      entryType: "group",
      rsvpId: rsvpId.toString(),
      displayName: "The Freitas",
    });

    expect(serializePublicContestantEntry(entry)).toBeNull();
    expect(
      serializePublicContestantEntry({ ...entry, status: "withdrawn" }),
    ).toBeNull();
    expect(
      serializePublicContestantEntry({ ...entry, status: "ready" }),
    ).toBeNull();
    expect(
      serializePublicContestantEntry({
        ...entry,
        status: "ready",
        contestPhoto: {
          assetId: "private-asset-id",
          publicId: "private-cloudinary-id",
          format: "png",
          bytes: 1024,
          width: 800,
          height: 600,
          uploadedAt: new Date("2026-10-01T00:00:00.000Z"),
          consentAt: new Date("2026-10-01T00:00:00.000Z"),
          consentByRsvpId: rsvpId.toString(),
        },
      }),
    ).toBeNull();
    expect(
      serializePublicContestantEntry({
        ...entry,
        status: "locked",
        contestPhoto: {
          assetId: "private-asset-id",
          publicId: "private-cloudinary-id",
          format: "png",
          bytes: 1024,
          width: 800,
          height: 600,
          uploadedAt: new Date("2026-10-01T00:00:00.000Z"),
          consentAt: new Date("2026-10-01T00:00:00.000Z"),
          consentByRsvpId: rsvpId.toString(),
        },
      }),
    ).toEqual({
      _id: entry._id.toString(),
      eventId: eventId.toString(),
      categoryId: categoryId.toString(),
      entryType: "group",
      displayName: "The Freitas",
    });
  });

  it("queries locked entries and returns no private asset identifiers", async () => {
    const candidate = createContestantEntry({
      eventId: eventId.toString(),
      categoryId: categoryId.toString(),
      entryType: "individual",
      rsvpId: rsvpId.toString(),
      displayName: "Ana",
    });
    const contestPhoto = {
      assetId: "internal-asset-id",
      publicId: `contest-photos/${eventId.toString()}/internal-cloudinary-id`,
      format: "png" as const,
      bytes: 1024,
      width: 800,
      height: 600,
      uploadedAt: new Date("2026-10-01T00:00:00.000Z"),
      consentAt: new Date("2026-10-01T00:00:00.000Z"),
      consentByRsvpId: rsvpId.toString(),
    };
    const lockedEntry = {
      ...candidate,
      status: "locked" as const,
      contestPhoto,
    };
    const candidatesFind = {
      sort: vi.fn().mockReturnThis(),
      toArray: vi.fn().mockResolvedValue([lockedEntry]),
    };
    dbMocks.findOne.mockResolvedValue({
      _id: categoryId,
      eventId,
      eligibility: "all",
    });
    dbMocks.find.mockReturnValue(candidatesFind);

    const candidates = await getVotingCandidatesForCategory(
      eventId.toString(),
      {
        _id: categoryId.toString(),
        eventId: eventId.toString(),
        title: "Geral",
        icon: "🎃",
        order: 1,
        eligibility: "all",
      },
      new ObjectId("507f1f77bcf86cd799439016").toString(),
    );

    expect(candidates).toEqual([
      {
        _id: candidate._id.toString(),
        eventId: eventId.toString(),
        fullName: "Ana",
        imageUrl: "https://private.example/temporary",
      },
    ]);
    expect(dbMocks.find).toHaveBeenCalledWith({
      eventId,
      status: "locked",
      $or: [{ categoryId }, { entryType: "individual" }],
    });
    expect(candidatesFind.sort).toHaveBeenCalledWith({
      displayName: 1,
      _id: 1,
    });
    expect(JSON.stringify(candidates)).not.toContain("internal-asset-id");
    expect(JSON.stringify(candidates)).not.toContain("internal-cloudinary-id");
  });
});
