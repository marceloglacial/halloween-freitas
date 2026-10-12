export const requiredIndexes = [
  {
    collection: "events",
    label: "event slug",
    key: { slug: 1 },
    options: { unique: true },
  },
  {
    collection: "events",
    label: "event year",
    key: { year: 1 },
    options: { unique: true },
  },
  {
    collection: "events",
    label: "active event",
    key: { status: 1 },
    options: {
      unique: true,
      partialFilterExpression: { status: "active" },
    },
  },
  {
    collection: "users",
    label: "registration",
    key: { eventId: 1, normalizedEmail: 1 },
    options: { unique: true },
  },
  {
    collection: "categories",
    label: "category order",
    key: { eventId: 1, order: 1 },
    options: { unique: true },
  },
  {
    collection: "users",
    label: "guest ownership",
    key: { eventId: 1, clerkUserId: 1 },
    options: {
      unique: true,
      partialFilterExpression: { clerkUserId: { $type: "string" } },
    },
  },
  {
    collection: "requestRateLimits",
    label: "request rate-limit expiry",
    key: { expiresAt: 1 },
    options: { expireAfterSeconds: 0 },
  },
  {
    collection: "partyAlbums",
    label: "one party album per event",
    key: { eventId: 1 },
    options: { unique: true },
  },
  {
    collection: "partyPhotos",
    label: "guest party photos per event",
    key: { eventId: 1, uploaderRsvpId: 1, uploadedAt: -1, _id: -1 },
    options: {},
  },
  {
    collection: "partyPhotoCleanups",
    label: "party photo cleanup retry order",
    key: { eventId: 1, nextAttemptAt: 1, _id: 1 },
    options: {},
  },
  {
    collection: "contestants",
    label: "adult contestant ownership",
    key: { eventId: 1, ownerRsvpId: 1, entryType: 1 },
    options: {
      unique: true,
      partialFilterExpression: { ownerRsvpId: { $type: "objectId" } },
    },
  },
  {
    collection: "contestants",
    label: "guardian contestant entries",
    key: { eventId: 1, guardianRsvpId: 1 },
    options: {},
  },
  {
    collection: "contestants",
    label: "event contestant readiness",
    key: { eventId: 1, status: 1, entryType: 1 },
    options: {},
  },
  {
    collection: "votingRounds",
    label: "round type per event",
    key: { eventId: 1, type: 1 },
    options: { unique: true },
  },
  {
    collection: "votingRounds",
    label: "one open round per event",
    key: { eventId: 1 },
    options: {
      unique: true,
      partialFilterExpression: { status: "open" },
    },
  },
  {
    collection: "votes",
    label: "vote",
    key: { eventId: 1, roundId: 1, categoryId: 1, voterRsvpId: 1 },
    options: {
      unique: true,
      partialFilterExpression: {
        roundId: { $type: "objectId" },
        voterRsvpId: { $type: "objectId" },
      },
    },
  },
];

const duplicateChecks = [
  {
    collection: "users",
    label: "guest ownership",
    pipeline: [
      { $match: { clerkUserId: { $type: "string" } } },
      {
        $group: {
          _id: { eventId: "$eventId", clerkUserId: "$clerkUserId" },
          count: { $sum: 1 },
        },
      },
      { $match: { count: { $gt: 1 } } },
    ],
  },
  {
    collection: "events",
    label: "event year",
    pipeline: [
      { $group: { _id: "$year", count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
    ],
  },
  {
    collection: "partyAlbums",
    label: "one party album per event",
    pipeline: [
      {
        $group: { _id: "$eventId", count: { $sum: 1 } },
      },
      { $match: { count: { $gt: 1 } } },
    ],
  },
  {
    collection: "events",
    label: "event slug",
    pipeline: [
      { $group: { _id: "$slug", count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
    ],
  },
  {
    collection: "events",
    label: "active event",
    pipeline: [
      { $match: { status: "active" } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
    ],
  },
  {
    collection: "users",
    label: "registration",
    pipeline: [
      {
        $group: {
          _id: { eventId: "$eventId", normalizedEmail: "$normalizedEmail" },
          count: { $sum: 1 },
        },
      },
      { $match: { count: { $gt: 1 } } },
    ],
  },
  {
    collection: "contestants",
    label: "adult contestant ownership",
    pipeline: [
      { $match: { ownerRsvpId: { $type: "objectId" } } },
      {
        $group: {
          _id: {
            eventId: "$eventId",
            ownerRsvpId: "$ownerRsvpId",
            entryType: "$entryType",
          },
          count: { $sum: 1 },
        },
      },
      { $match: { count: { $gt: 1 } } },
    ],
  },
  {
    collection: "categories",
    label: "category order",
    pipeline: [
      {
        $group: {
          _id: { eventId: "$eventId", order: "$order" },
          count: { $sum: 1 },
        },
      },
      { $match: { count: { $gt: 1 } } },
    ],
  },
  {
    collection: "votingRounds",
    label: "round type per event",
    pipeline: [
      {
        $group: {
          _id: { eventId: "$eventId", type: "$type" },
          count: { $sum: 1 },
        },
      },
      { $match: { count: { $gt: 1 } } },
    ],
  },
  {
    collection: "votingRounds",
    label: "one open round per event",
    pipeline: [
      { $match: { status: "open" } },
      { $group: { _id: "$eventId", count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
    ],
  },
  {
    collection: "votes",
    label: "vote",
    pipeline: [
      {
        $match: {
          roundId: { $type: "objectId" },
          voterRsvpId: { $type: "objectId" },
        },
      },
      {
        $group: {
          _id: {
            eventId: "$eventId",
            roundId: "$roundId",
            categoryId: "$categoryId",
            voterRsvpId: "$voterRsvpId",
          },
          count: { $sum: 1 },
        },
      },
      { $match: { count: { $gt: 1 } } },
    ],
  },
];

function sameDocument(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

export async function assertNoDuplicateData(db) {
  for (const check of duplicateChecks) {
    const duplicate = await db
      .collection(check.collection)
      .aggregate(check.pipeline)
      .limit(1)
      .next();
    if (duplicate) {
      throw new Error(
        `Resolve duplicate ${check.label} records before creating indexes`,
      );
    }
  }
}

export async function createRequiredIndexes(db) {
  await assertNoDuplicateData(db);
  for (const index of requiredIndexes) {
    await db.collection(index.collection).createIndex(index.key, index.options);
  }
}

export async function getIndexIssues(db) {
  const indexesByCollection = new Map();
  const issues = [];

  for (const required of requiredIndexes) {
    if (!indexesByCollection.has(required.collection)) {
      indexesByCollection.set(
        required.collection,
        await db.collection(required.collection).indexes(),
      );
    }

    const existing = indexesByCollection
      .get(required.collection)
      .find((index) => sameDocument(index.key, required.key));
    if (!existing) {
      issues.push(`${required.label}: missing`);
      continue;
    }

    if (Boolean(existing.unique) !== Boolean(required.options.unique)) {
      issues.push(`${required.label}: incorrect unique option`);
    }
    if (
      !sameDocument(
        existing.partialFilterExpression,
        required.options.partialFilterExpression,
      )
    ) {
      issues.push(`${required.label}: incorrect partial filter`);
    }
  }

  return issues;
}
