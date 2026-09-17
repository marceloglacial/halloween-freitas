import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

export function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
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
