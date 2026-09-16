import { ObjectId } from "mongodb";
import { isAdmin } from "@/lib/auth/admin";
import { getDb } from "@/lib/db";
import { getEventById } from "@/lib/events";
import { errorResponse } from "@/lib/http";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin())) return errorResponse("Não autorizado", 401);
  const { id } = await params;
  if (!ObjectId.isValid(id)) return errorResponse("Evento inválido", 400);
  try {
    const result = await (
      await getDb()
    )
      .collection("events")
      .updateOne(
        { _id: new ObjectId(id) },
        { $set: { status: "archived", updatedAt: new Date() } },
      );
    if (!result.matchedCount)
      return errorResponse("Evento não encontrado", 404);
    return Response.json(await getEventById(id));
  } catch (error) {
    console.error("Admin event archival failed", error);
    return errorResponse("Não foi possível arquivar o evento", 500);
  }
}
