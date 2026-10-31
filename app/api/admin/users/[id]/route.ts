import { auth } from "@clerk/nextjs/server";
import { ObjectId } from "mongodb";
import { isAdmin } from "@/lib/auth/admin";
import { getAdminGuestDetail } from "@/lib/admin-guest-detail";
import { getEventById } from "@/lib/events";
import { errorResponse, logServerError } from "@/lib/http";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId || !(await isAdmin(userId))) {
    return errorResponse("Não autorizado", 401);
  }

  const { id } = await params;
  const eventId = new URL(request.url).searchParams.get("eventId");
  if (!ObjectId.isValid(id)) return errorResponse("Convidado inválido", 400);
  if (!eventId || !ObjectId.isValid(eventId)) {
    return errorResponse("Evento inválido", 400);
  }

  try {
    const event = await getEventById(eventId);
    if (!event) return errorResponse("Evento não encontrado", 404);
    const detail = await getAdminGuestDetail(event, id);
    if (!detail) return errorResponse("Convidado não encontrado", 404);
    return Response.json(detail, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    logServerError("Admin guest detail lookup failed", error);
    return errorResponse("Não foi possível carregar o convidado", 500);
  }
}
