export function getDatabaseConfig() {
  const url = process.env.DATABASE_URL;
  const name = process.env.DATABASE_NAME;

  if (!url || !name) {
    throw new Error("DATABASE_URL and DATABASE_NAME must be configured");
  }

  return { url, name };
}
