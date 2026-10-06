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
    options: {},
  },
  {
    collection: "votes",
    label: "vote",
    key: { eventId: 1, voterId: 1, categoryId: 1 },
    options: { unique: true },
  },
];

const duplicateChecks = [
  {
    collection: "events",
    label: "event year",
    pipeline: [
      { $group: { _id: "$year", count: { $sum: 1 } } },
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
    collection: "votes",
    label: "vote",
    pipeline: [
      {
        $group: {
          _id: {
            eventId: "$eventId",
            voterId: "$voterId",
            categoryId: "$categoryId",
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
