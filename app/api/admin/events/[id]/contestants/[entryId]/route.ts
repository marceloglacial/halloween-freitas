import { auth } from "@clerk/nextjs/server";
import { ObjectId } from "mongodb";
import { isAdmin } from "@/lib/auth/admin";
import {
  ContestEntryClosedError,
  claimContestEntryWrite,
} from "@/lib/contest-entry-writes";
import { enqueueContestPhotoCleanup } from "@/lib/contestant-photo-cleanup";
import type { ContestantEntryDocument } from "@/lib/contestant-entries";
import { getDb, getMongoClient } from "@/lib/db";
import { getEventById } from "@/lib/events";
import { errorResponse, logServerError } from "@/lib/http";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; entryId: string }> },
) {
  const { userId } = await auth();
  if (!userId || !(await isAdmin(userId))) {
    return errorResponse("Não autorizado", 401);
  }

  const { id, entryId } = await params;
  if (!ObjectId.isValid(id)) return errorResponse("Evento inválido", 400);
  if (!ObjectId.isValid(entryId)) {
    return errorResponse("Fantasia inválida", 400);
  }

  try {
    const event = await getEventById(id);
    if (!event) return errorResponse("Evento não encontrado", 404);
    const eventId = new ObjectId(event._id);
    const candidateId = new ObjectId(entryId);
    const db = await getDb();
    const client = await getMongoClient();
    const session = client.startSession();
    let outcome: "deleted" | "has-votes" | "not-found" = "not-found";
    try {
      outcome = await session.withTransaction(async () => {
        await claimContestEntryWrite(db, eventId, session, new Date());
        const contestants =
          db.collection<ContestantEntryDocument>("contestants");
        const entry = await contestants.findOne(
          { _id: candidateId, eventId },
          { session },
        );
        if (!entry) return "not-found";

        const votes = await db
          .collection("votes")
          .findOne(
            { eventId, candidateId },
            { session, projection: { _id: 1 } },
          );
        if (votes) {
          return "has-votes";
        }

        if (entry.contestPhoto?.assetId && entry.contestPhoto.publicId) {
          await enqueueContestPhotoCleanup(
            db,
            {
              eventId,
              assetId: entry.contestPhoto.assetId,
              publicId: entry.contestPhoto.publicId,
              now: new Date(),
            },
            session,
          );
        }
        const removed = await contestants.deleteOne(
          { _id: candidateId, eventId },
          { session },
        );
        if (!removed.deletedCount) return "not-found";

        await db.collection("adminAudits").insertOne(
          {
            eventId,
            clerkUserId: userId,
            action: "contestant_removed_by_admin",
            targetType: "contestant",
            targetId: candidateId,
            at: new Date(),
            changes: { entryType: entry.entryType },
          },
          { session },
        );
        return "deleted";
      });
    } finally {
      await session.endSession();
    }

    if (outcome === "has-votes") {
      return errorResponse(
        "Uma fantasia com votos não pode ser excluída.",
        409,
      );
    }
    if (outcome !== "deleted") {
      return errorResponse("Fantasia não encontrada", 404);
    }
    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof ContestEntryClosedError) {
      return errorResponse(
        "Fantasias não podem ser excluídas após o encerramento das inscrições ou a abertura da votação.",
        409,
      );
    }
    logServerError("Admin contestant deletion failed", error);
    return errorResponse("Não foi possível excluir a fantasia", 500);
  }
}
