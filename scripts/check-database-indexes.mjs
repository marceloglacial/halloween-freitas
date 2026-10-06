import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { MongoClient } from "mongodb";
import { getIndexIssues } from "./database-indexes.mjs";

for (const envFile of [".env.local", ".env"]) {
  if (existsSync(envFile)) loadEnvFile(envFile);
}

const url = process.env.DATABASE_URL;
const databaseName = process.env.DATABASE_NAME;
if (!url || !databaseName) {
  throw new Error("DATABASE_URL and DATABASE_NAME must be configured");
}

const client = new MongoClient(url);

try {
  await client.connect();
  const issues = await getIndexIssues(client.db(databaseName));
  if (issues.length) {
    console.error("Database index verification failed:");
    for (const issue of issues) console.error(`- ${issue}`);
    process.exitCode = 1;
  } else {
    console.log("All required database indexes are configured.");
  }
} finally {
  await client.close();
}
