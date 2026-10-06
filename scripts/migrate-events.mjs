import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { MongoClient, ObjectId } from "mongodb";
import { createRequiredIndexes } from "./database-indexes.mjs";

for (const envFile of [".env.local", ".env"]) {
  if (existsSync(envFile)) loadEnvFile(envFile);
}

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
  for await (const user of users.find({})) {
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

  await createRequiredIndexes(db);

  console.log(`Event migration complete: ${eventId.toString()}`);
} finally {
  await client.close();
}
