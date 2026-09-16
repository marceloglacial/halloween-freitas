import { ObjectId } from "mongodb";
import { isAdmin } from "@/lib/auth/admin";
import { getDb, getMongoClient } from "@/lib/db";
import { getEventById } from "@/lib/events";
import { errorResponse } from "@/lib/http";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin())) return errorResponse("Não autorizado", 401);
  const { id } = await params;
  if (!ObjectId.isValid(id)) return errorResponse("Evento inválido", 400);

  const client = await getMongoClient();
  const db = await getDb();
  const session = client.startSession();
  try {
    await session.withTransaction(async () => {
      const eventId = new ObjectId(id);
      const event = await db
        .collection("events")
        .findOne({ _id: eventId }, { session });
      if (!event) throw new Error("EVENT_NOT_FOUND");
      await db
        .collection("events")
        .updateMany(
          { status: "active", _id: { $ne: eventId } },
          { $set: { status: "archived", updatedAt: new Date() } },
          { session },
        );
      await db
        .collection("events")
        .updateOne(
          { _id: eventId },
          { $set: { status: "active", updatedAt: new Date() } },
          { session },
        );
    });
    return Response.json(await getEventById(id));
  } catch (error) {
    if (error instanceof Error && error.message === "EVENT_NOT_FOUND") {
      return errorResponse("Evento não encontrado", 404);
    }
    console.error("Admin event activation failed", error);
    return errorResponse("Não foi possível ativar o evento", 500);
  } finally {
    await session.endSession();
  }
}
