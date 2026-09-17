import { Db, MongoClient } from "mongodb";
import { getDatabaseConfig } from "@/lib/env";

const globalForMongo = globalThis as typeof globalThis & {
  mongoClientPromise?: Promise<MongoClient>;
};

export async function getMongoClient(): Promise<MongoClient> {
  const { url } = getDatabaseConfig();

  if (!globalForMongo.mongoClientPromise) {
    const client = new MongoClient(url);
    globalForMongo.mongoClientPromise = client.connect().catch((error) => {
      globalForMongo.mongoClientPromise = undefined;
      throw error;
    });
  }

  return globalForMongo.mongoClientPromise;
}

export async function getDb(): Promise<Db> {
  const { name } = getDatabaseConfig();
  return (await getMongoClient()).db(name);
}
