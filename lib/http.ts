import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

export function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export function logServerError(context: string, error: unknown) {
  // Exception messages and SDK response bodies can contain credentials or email.
  const locations =
    error instanceof Error
      ? (error.stack ?? "")
          .split("\n")
          .slice(1)
          .flatMap((frame) => {
            const location = frame.match(
              /\/([A-Za-z0-9_.-]+\.[cm]?[jt]sx?):(\d+):(\d+)\)?$/,
            );
            return location
              ? [`${location[1]}:${location[2]}:${location[3]}`]
              : [];
          })
          .slice(0, 6)
      : [];
  console.error(context, {
    errorType: error instanceof Error ? error.constructor.name : typeof error,
    code:
      error &&
      typeof error === "object" &&
      "code" in error &&
      typeof error.code === "number"
        ? error.code
        : undefined,
    locations,
  });
}

export function parseObjectId(value: unknown): ObjectId | null {
  return typeof value === "string" && ObjectId.isValid(value)
    ? new ObjectId(value)
    : null;
}

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

export function normalizeName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim().replace(/\s+/g, " ");
  return name.length >= 2 && name.length <= 120 ? name : null;
}

export async function readJsonObject(
  request: Request,
): Promise<Record<string, unknown> | null> {
  try {
    const value: unknown = await request.json();
    return value !== null && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}
