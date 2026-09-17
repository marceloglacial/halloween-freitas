export function getDatabaseConfig() {
  const url = process.env.DATABASE_URL;
  const name = process.env.DATABASE_NAME;

  if (!url || !name) {
    throw new Error("DATABASE_URL and DATABASE_NAME must be configured");
  }

  return { url, name };
}

export function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must contain at least 32 characters");
  }
  return secret;
}
