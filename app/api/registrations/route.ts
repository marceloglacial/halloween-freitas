import { MongoServerError, ObjectId } from "mongodb";
import { getDb } from "@/lib/db";
import { getCurrentEvent, getEventPhase } from "@/lib/events";
import {
  errorResponse,
  normalizeEmail,
  normalizeName,
  readJsonObject,
} from "@/lib/http";

export async function POST(request: Request) {
  try {
    const event = await getCurrentEvent();
    if (!event || getEventPhase(event) !== "registration") {
      return errorResponse("As inscrições não estão abertas", 403);
    }

    const body = await readJsonObject(request);
    if (!body) return errorResponse("Corpo da requisição inválido", 400);
    const fullName = normalizeName(body.fullName);
    const normalizedEmail = normalizeEmail(body.email);
    if (!fullName || !normalizedEmail) {
      return errorResponse("Nome ou email inválido", 400);
    }

    const db = await getDb();
    const result = await db.collection("users").insertOne({
      eventId: new ObjectId(event._id),
      fullName,
      email: normalizedEmail,
      normalizedEmail,
      imageUrl: null,
      group: false,
      junior: false,
      createdAt: new Date(),
    });
    return Response.json(
      { _id: result.insertedId.toString() },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      return errorResponse("Este email já está inscrito", 409);
    }
    console.error("Registration failed", error);
    return errorResponse("Não foi possível realizar a inscrição", 500);
  }
}
