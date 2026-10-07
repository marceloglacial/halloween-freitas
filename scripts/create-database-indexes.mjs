import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { MongoClient } from "mongodb";
import { createRequiredIndexes, getIndexIssues } from "./database-indexes.mjs";

for (const envFile of [".env.local", ".env"]) {
  if (existsSync(envFile)) loadEnvFile(envFile);
}
const url = process.env.DATABASE_URL;
const databaseName = process.env.DATABASE_NAME;
if (!url || !databaseName)
  throw new Error("DATABASE_URL and DATABASE_NAME must be configured");
const client = new MongoClient(url);
try {
  await client.connect();
  const db = client.db(databaseName);
  await createRequiredIndexes(db);
  const issues = await getIndexIssues(db);
  if (issues.length) throw new Error(issues.join("; "));
  console.log(
    "All required database indexes are configured. Registration records were not changed.",
  );
} finally {
  await client.close();
}
