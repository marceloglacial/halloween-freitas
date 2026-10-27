import { MongoServerError, ObjectId } from "mongodb";
import { auth } from "@clerk/nextjs/server";
import { isAdmin } from "@/lib/auth/admin";
import { getDb, getMongoClient } from "@/lib/db";
import {
  claimContestEntryWrite,
  ContestEntryClosedError,
} from "@/lib/contest-entry-writes";
import { getEventById } from "@/lib/events";
import {
  errorResponse,
  normalizeEmail,
  normalizeName,
  parseObjectId,
  readJsonObject,
  logServerError,
} from "@/lib/http";
import { getAdminUsersForEvent } from "@/lib/users";
import {
  getAdminGroupEntriesForEvent,
  getAdminParticipantRsvpIdsForEvent,
} from "@/lib/contestant-entries";
import type { ContestantEntryDocument } from "@/lib/contestant-entries";
import { enqueueContestPhotoCleanup } from "@/lib/contestant-photo-cleanup";

class DuplicateGuestEmailError extends Error {}

async function adminEvent(eventId: unknown) {
  if (!(await isAdmin())) return errorResponse("Não autorizado", 401);
  if (typeof eventId !== "string" || !ObjectId.isValid(eventId)) {
    return errorResponse("Evento inválido", 400);
  }
  const event = await getEventById(eventId);
  return event ?? errorResponse("Evento não encontrado", 404);
}

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const event = await adminEvent(params.get("eventId"));
    if (event instanceof Response) return event;
    const participantsOnly = params.get("participantsOnly") === "true";
    const [users, groupEntries, participantIds] = await Promise.all([
      getAdminUsersForEvent(event._id),
      getAdminGroupEntriesForEvent(event._id, participantsOnly),
      participantsOnly
        ? getAdminParticipantRsvpIdsForEvent(event._id)
        : Promise.resolve(null),
    ]);
    const groupsByOwner = new Map<
      string,
      Array<{ displayName: string; status: ContestantEntryStatus }>
    >();
    for (const entry of groupEntries) {
      const entries = groupsByOwner.get(entry.ownerRsvpId) ?? [];
      entries.push({ displayName: entry.displayName, status: entry.status });
      groupsByOwner.set(entry.ownerRsvpId, entries);
    }
    const visibleUsers = participantIds
      ? users.filter((user) => participantIds.includes(user._id))
      : users;
    return Response.json(
      visibleUsers.map((user) => ({
        ...user,
        ...(groupsByOwner.has(user._id)
          ? { groupEntries: groupsByOwner.get(user._id) }
          : {}),
      })),
    );
  } catch (error) {
    logServerError("Admin user listing failed", error);
    return errorResponse("Não foi possível carregar os usuários", 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    if (!body) return errorResponse("Corpo da requisição inválido", 400);
    const event = await adminEvent(body.eventId);
    if (event instanceof Response) return event;
    const fullName = normalizeName(body.fullName);
    const normalizedEmail = normalizeEmail(body.email);
    if (!fullName || !normalizedEmail) {
      return errorResponse("Nome ou email inválido", 400);
    }

    const eventId = new ObjectId(event._id);
    const client = await getMongoClient();
    const db = await getDb();
    const session = client.startSession();
    try {
      const created = await session.withTransaction(async () => {
        const now = new Date();
        await claimContestEntryWrite(db, eventId, session, now);
        const duplicate = await db
          .collection("users")
          .findOne({ eventId, normalizedEmail }, { session });
        if (duplicate) throw new DuplicateGuestEmailError();
        const result = await db.collection("users").insertOne(
          {
            eventId,
            fullName,
            email: normalizedEmail,
            normalizedEmail,
            createdAt: now,
          },
          { session },
        );
        return {
          _id: result.insertedId.toString(),
          eventId: event._id,
          fullName,
          email: normalizedEmail,
        };
      });
      if (!created) throw new Error("USER_NOT_CREATED");
      return Response.json(created, { status: 201 });
    } finally {
      await session.endSession();
    }
  } catch (error) {
    if (error instanceof ContestEntryClosedError) {
      return errorResponse("As inscrições do concurso estão encerradas", 409);
    }
    if (error instanceof DuplicateGuestEmailError) {
      return errorResponse("Este email já está inscrito", 409);
    }
    if (error instanceof MongoServerError && error.code === 11000) {
      return errorResponse("Este email já está inscrito", 409);
    }
    logServerError("Admin user creation failed", error);
    return errorResponse("Não foi possível criar o usuário", 500);
  }
}

export async function PUT(request: Request) {
  try {
    const body = await readJsonObject(request);
    if (!body) return errorResponse("Corpo da requisição inválido", 400);
    const { userId: actorId } = await auth();
    if (!actorId || !(await isAdmin(actorId))) {
      return errorResponse("Não autorizado", 401);
    }
    if (typeof body.eventId !== "string" || !ObjectId.isValid(body.eventId)) {
      return errorResponse("Evento inválido", 400);
    }
    const event = await getEventById(body.eventId);
    if (!event) return errorResponse("Evento não encontrado", 404);
    const userId = parseObjectId(body._id);
    const fullName = normalizeName(body.fullName);
    const normalizedEmail = normalizeEmail(body.email);
    if (!userId || !fullName || !normalizedEmail) {
      return errorResponse("Dados inválidos", 400);
    }

    const update = {
      fullName,
      email: normalizedEmail,
      normalizedEmail,
      contestantName: fullName,
      updatedAt: new Date(),
    };
    const eventObjectId = new ObjectId(event._id);
    const client = await getMongoClient();
    const db = await getDb();
    const session = client.startSession();
    let result;
    try {
      result = await session.withTransaction(async () => {
        const users = db.collection("users");
        const existing = await users.findOne(
          { _id: userId, eventId: eventObjectId },
          { session },
        );
        if (!existing) return { matchedCount: 0 };
        const duplicate = await users.findOne(
          {
            eventId: eventObjectId,
            normalizedEmail,
            _id: { $ne: userId },
          },
          { session },
        );
        if (duplicate) throw new DuplicateGuestEmailError();
        const correctionFields = [
          "fullName",
          "email",
          "normalizedEmail",
          "contestantName",
        ] as const;
        const changes = correctionFields.filter(
          (field) => existing[field] !== update[field],
        );
        if (changes.length === 0) return { matchedCount: 1 };
        const updated = await users.updateOne(
          { _id: userId, eventId: eventObjectId },
          { $set: update },
          { session },
        );
        if (updated.matchedCount) {
          await db.collection("adminAudits").insertOne(
            {
              eventId: eventObjectId,
              clerkUserId: actorId,
              action: "guest_record_corrected",
              targetType: "rsvp",
              targetId: userId,
              at: update.updatedAt,
              changes: { fields: changes },
            },
            { session },
          );
        }
        return updated;
      });
    } finally {
      await session.endSession();
    }
    if (!result) throw new Error("USER_UPDATE_FAILED");
    if (!result.matchedCount)
      return errorResponse("Usuário não encontrado", 404);
    return Response.json({ _id: body._id, eventId: event._id, ...update });
  } catch (error) {
    if (error instanceof DuplicateGuestEmailError) {
      return errorResponse("Este email já está inscrito", 409);
    }
    if (error instanceof MongoServerError && error.code === 11000) {
      return errorResponse("Este email já está inscrito", 409);
    }
    logServerError("Admin user update failed", error);
    return errorResponse("Não foi possível atualizar o usuário", 500);
  }
}

export async function DELETE(request: Request) {
  try {
    const { userId: actorId } = await auth();
    if (!actorId || !(await isAdmin(actorId))) {
      return errorResponse("Não autorizado", 401);
    }
    const body = await readJsonObject(request);
    if (!body) return errorResponse("Corpo da requisição inválido", 400);
    const event = await adminEvent(body.eventId);
    if (event instanceof Response) return event;
    const userId = parseObjectId(body._id);
    if (!userId) return errorResponse("Usuário inválido", 400);

    const eventObjectId = new ObjectId(event._id);
    const client = await getMongoClient();
    const db = await getDb();
    const session = client.startSession();
    let outcome;
    try {
      outcome = await session.withTransaction(async () => {
        await claimContestEntryWrite(db, eventObjectId, session, new Date());
        const contestantEntries = await db
          .collection<ContestantEntryDocument>("contestants")
          .find(
            { eventId: eventObjectId, ownerRsvpId: userId },
            { projection: { _id: 1, contestPhoto: 1 }, session },
          )
          .toArray();
        const candidateIds = contestantEntries.map((entry) => entry._id);
        const votes = await db.collection("votes").findOne(
          {
            eventId: eventObjectId,
            $or: [
              { voterRsvpId: userId },
              ...(candidateIds.length
                ? [{ candidateId: { $in: candidateIds } }]
                : []),
            ],
          },
          { session },
        );
        if (votes) return { hasVotes: true as const };
        for (const entry of contestantEntries) {
          if (entry.contestPhoto?.assetId && entry.contestPhoto.publicId) {
            await enqueueContestPhotoCleanup(
              db,
              {
                eventId: eventObjectId,
                assetId: entry.contestPhoto.assetId,
                publicId: entry.contestPhoto.publicId,
                now: new Date(),
              },
              session,
            );
          }
        }
        await db
          .collection("contestants")
          .deleteMany(
            { eventId: eventObjectId, ownerRsvpId: userId },
            { session },
          );
        const result = await db
          .collection("users")
          .deleteOne({ _id: userId, eventId: eventObjectId }, { session });
        if (result.deletedCount) {
          await db.collection("adminAudits").insertOne(
            {
              eventId: eventObjectId,
              clerkUserId: actorId,
              action: "guest_and_contestants_removed_by_admin",
              targetType: "rsvp",
              targetId: userId,
              at: new Date(),
              changes: { contestantEntriesRemoved: contestantEntries.length },
            },
            { session },
          );
        }
        return { hasVotes: false as const, result };
      });
    } finally {
      await session.endSession();
    }
    if (!outcome) throw new Error("USER_DELETE_FAILED");
    if (outcome.hasVotes) {
      return errorResponse("Usuários com votos não podem ser excluídos", 409);
    }
    if (!outcome.result.deletedCount)
      return errorResponse("Usuário não encontrado", 404);
    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof ContestEntryClosedError) {
      return errorResponse("As inscrições do concurso estão encerradas", 409);
    }
    logServerError("Admin user deletion failed", error);
    return errorResponse("Não foi possível excluir o usuário", 500);
  }
}
