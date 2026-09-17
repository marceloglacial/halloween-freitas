import { MongoServerError, ObjectId } from "mongodb";
import { isAdmin } from "@/lib/auth/admin";
import { getDb } from "@/lib/db";
import { parseEventInput } from "@/lib/event-schedule";
import { getEventById } from "@/lib/events";
import { errorResponse, readJsonObject } from "@/lib/http";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin())) return errorResponse("Não autorizado", 401);
  const { id } = await params;
  if (!ObjectId.isValid(id)) return errorResponse("Evento inválido", 400);
  const body = await readJsonObject(request);
  const parsed = parseEventInput(body);
  if ("error" in parsed) return errorResponse(parsed.error, 400);

  try {
    const db = await getDb();
    const existing = await getEventById(id);
    if (!existing) return errorResponse("Evento não encontrado", 404);
    if (existing.year !== parsed.value.year) {
      return errorResponse("O ano do evento não pode ser alterado", 400);
    }
    await db.collection("events").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          ...parsed.value,
          updatedAt: new Date(),
        },
      },
    );
    return Response.json(await getEventById(id));
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      return errorResponse("Já existe um evento para este ano", 409);
    }
    console.error("Admin event update failed", error);
    return errorResponse("Não foi possível atualizar o evento", 500);
  }
}
