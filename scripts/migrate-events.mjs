import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { MongoClient, ObjectId } from "mongodb";

const envFile = [".env.local", ".env"].find((path) => existsSync(path));
if (envFile) loadEnvFile(envFile);

const url = process.env.DATABASE_URL;
const databaseName = process.env.DATABASE_NAME;
if (!url || !databaseName) {
  throw new Error("DATABASE_URL and DATABASE_NAME must be configured");
}

const client = new MongoClient(url);

function categoryEligibility(title = "") {
  const normalized = title.toLocaleLowerCase("pt-BR");
  if (normalized.includes("grupo") || normalized.includes("dupla")) {
    return "group";
  }
  if (normalized.includes("infantil") || normalized.includes("junior")) {
    return "junior";
  }
  return "all";
}

async function assertNoDuplicates(collection, pipeline, label) {
  const duplicates = await collection.aggregate(pipeline).limit(1).toArray();
  if (duplicates.length) {
    throw new Error(
      `Resolve duplicate ${label} records before creating indexes`,
    );
  }
}

try {
  await client.connect();
  const db = client.db(databaseName);
  const events = db.collection("events");
  const users = db.collection("users");
  const categories = db.collection("categories");
  const votes = db.collection("votes");

  const eventResult = await events.findOneAndUpdate(
    { slug: "halloween-2025" },
    {
      $setOnInsert: {
        _id: new ObjectId(),
        year: 2025,
        title: "Halloween dos Freitas 2025",
        timezone: "America/Toronto",
        startsAt: new Date("2025-11-01T00:00:00.000Z"),
        registrationOpensAt: new Date("2025-08-01T04:00:00.000Z"),
        registrationClosesAt: new Date("2025-10-31T23:59:00.000Z"),
        votingStatus: "ended",
        resultsPublished: true,
        status: "archived",
        createdAt: new Date(),
      },
    },
    { upsert: true, returnDocument: "after" },
  );
  const eventId = eventResult._id;

  const migrationTime = new Date();
  for await (const event of events.find({})) {
    const formatter = new Intl.DateTimeFormat("en", {
      timeZone: event.timezone || "UTC",
      year: "numeric",
    });
    const year = Number(formatter.format(new Date(event.startsAt)));
    const oldResultsPublishedAt = new Date(event.resultsPublishedAt);
    const oldVotingClosesAt = new Date(event.votingClosesAt);
    const resultsWerePublic =
      event.status === "archived" ||
      (!Number.isNaN(oldResultsPublishedAt.getTime()) &&
        oldResultsPublishedAt <= migrationTime);
    const votingHadEnded =
      resultsWerePublic ||
      (!Number.isNaN(oldVotingClosesAt.getTime()) &&
        oldVotingClosesAt <= migrationTime);
    const lifecycle = { year };
    if (!event.votingStatus) {
      lifecycle.votingStatus = votingHadEnded ? "ended" : "not_started";
    }
    if (typeof event.resultsPublished !== "boolean") {
      lifecycle.resultsPublished = resultsWerePublic;
    }
    await events.updateOne(
      { _id: event._id },
      {
        $set: lifecycle,
        $unset: {
          votingOpensAt: "",
          votingClosesAt: "",
          resultsPublishedAt: "",
        },
      },
    );
  }

  await users.updateMany(
    { eventId: { $exists: false } },
    { $set: { eventId } },
  );
  for await (const user of users.find({ eventId })) {
    const normalizedEmail = String(user.email ?? "")
      .trim()
      .toLowerCase();
    await users.updateOne({ _id: user._id }, { $set: { normalizedEmail } });
  }

  await categories.updateMany(
    { eventId: { $exists: false } },
    { $set: { eventId } },
  );
  for await (const category of categories.find({ eventId })) {
    const order = Number(category.order);
    await categories.updateOne(
      { _id: category._id },
      {
        $set: {
          eligibility: categoryEligibility(category.title),
          order: Number.isFinite(order) ? order : 0,
        },
      },
    );
  }
  await votes.updateMany(
    { eventId: { $exists: false } },
    { $set: { eventId } },
  );

  await assertNoDuplicates(
    events,
    [
      { $group: { _id: "$year", count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
    ],
    "event year",
  );
  await assertNoDuplicates(
    users,
    [
      { $match: { eventId } },
      {
        $group: {
          _id: { eventId: "$eventId", email: "$normalizedEmail" },
          count: { $sum: 1 },
        },
      },
      { $match: { count: { $gt: 1 } } },
    ],
    "user email",
  );
  await assertNoDuplicates(
    votes,
    [
      { $match: { eventId } },
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
    "vote",
  );

  await Promise.all([
    events.createIndex({ slug: 1 }, { unique: true }),
    events.createIndex({ year: 1 }, { unique: true }),
    events.createIndex(
      { status: 1 },
      { unique: true, partialFilterExpression: { status: "active" } },
    ),
    users.createIndex({ eventId: 1, normalizedEmail: 1 }, { unique: true }),
    categories.createIndex({ eventId: 1, order: 1 }),
    votes.createIndex(
      { eventId: 1, voterId: 1, categoryId: 1 },
      { unique: true },
    ),
  ]);

  console.log(`Event migration complete: ${eventId.toString()}`);
} finally {
  await client.close();
}
