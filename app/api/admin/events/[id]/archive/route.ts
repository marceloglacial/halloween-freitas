import { ObjectId } from "mongodb";
import { isAdmin } from "@/lib/auth/admin";
import { getDb, getMongoClient } from "@/lib/db";
import { getEventById } from "@/lib/events";
import { errorResponse, logServerError } from "@/lib/http";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin())) return errorResponse("Não autorizado", 401);
  const { id } = await params;
  if (!ObjectId.isValid(id)) return errorResponse("Evento inválido", 400);
  try {
    const db = await getDb();
    const session = (await getMongoClient()).startSession();
    let found = false;
    try {
      await session.withTransaction(async () => {
        const eventId = new ObjectId(id);
        const now = new Date();
        const event = await db
          .collection("events")
          .findOne({ _id: eventId }, { session });
        if (!event) return;
        found = true;
        await db.collection("events").updateOne(
          { _id: eventId },
          {
            $set: {
              status: "archived",
              ...(event.votingStatus === "open"
                ? { votingStatus: "ended" }
                : {}),
              updatedAt: now,
            },
          },
          { session },
        );
        if (event.votingStatus === "open") {
          const result = await db
            .collection("votingRounds")
            .updateOne(
              { eventId, status: "open" },
              { $set: { status: "ended", endedAt: now } },
              { session },
            );
          if (!result.matchedCount)
            throw new Error("OPEN_VOTING_ROUND_NOT_FOUND");
        }
      });
    } finally {
      await session.endSession();
    }
    if (!found) return errorResponse("Evento não encontrado", 404);
    return Response.json(await getEventById(id));
  } catch (error) {
    logServerError("Admin event archival failed", error);
    return errorResponse("Não foi possível arquivar o evento", 500);
  }
}
