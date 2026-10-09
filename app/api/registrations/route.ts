import { MongoServerError, ObjectId, type ClientSession } from "mongodb";
import { getDb, getMongoClient } from "@/lib/db";
import { getCurrentEvent, getRegistrationState } from "@/lib/events";
import {
  errorResponse,
  logServerError,
  normalizeEmail,
  normalizeName,
  readJsonObject,
} from "@/lib/http";

class RegistrationUnavailableError extends Error {}

function registrationWriteFilter(eventId: ObjectId, now: Date) {
  return {
    _id: eventId,
    status: "active",
    votingStatus: "not_started",
    $or: [
      { registrationStartsAt: { $lte: now } },
      {
        registrationStartsAt: { $exists: false },
        registrationOpensAt: { $lte: now },
      },
    ],
  };
}

function confirmedResponse() {
  return Response.json({ message: "Presença confirmada!" }, { status: 201 });
}

export async function POST(request: Request) {
  let session: ClientSession | undefined;
  try {
    const body = await readJsonObject(request);
    if (!body) return errorResponse("Corpo da requisição inválido", 400);
    const fullName = normalizeName(body.fullName);
    const normalizedEmail = normalizeEmail(body.email);
    if (!fullName || !normalizedEmail) {
      return errorResponse("Nome ou email inválido", 400);
    }

    const event = await getCurrentEvent();
    if (!event) {
      return errorResponse("As inscrições não estão abertas", 403);
    }
    const now = new Date();
    const registrationState = getRegistrationState(event, now);
    if (registrationState === "upcoming") {
      return errorResponse("As inscrições ainda não estão abertas", 403);
    }
    if (registrationState === "closed") {
      return errorResponse("As inscrições estão encerradas", 403);
    }

    const client = await getMongoClient();
    const db = await getDb();
    session = client.startSession();
    await session.withTransaction(async () => {
      const eventId = new ObjectId(event._id);
      const gate = await db
        .collection("events")
        .updateOne(
          registrationWriteFilter(eventId, now),
          { $inc: { rsvpMutationVersion: 1 } },
          { session },
        );
      if (!gate.matchedCount) throw new RegistrationUnavailableError();

      await db.collection("users").insertOne(
        {
          eventId,
          fullName,
          email: normalizedEmail,
          normalizedEmail,
          imageUrl: null,
          contestant: false,
          group: false,
          junior: false,
          createdAt: now,
        },
        { session },
      );
    });
    return confirmedResponse();
  } catch (error) {
    if (error instanceof RegistrationUnavailableError) {
      return errorResponse("As inscrições foram encerradas", 403);
    }
    if (error instanceof MongoServerError && error.code === 11000) {
      return confirmedResponse();
    }
    logServerError("Registration failed", error);
    return errorResponse("Não foi possível realizar a inscrição", 500);
  } finally {
    await session?.endSession();
  }
}
