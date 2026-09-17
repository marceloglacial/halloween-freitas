import { getCurrentEvent, getEventPhase } from "@/lib/events";
import { errorResponse } from "@/lib/http";

export async function GET() {
  try {
    const event = await getCurrentEvent();
    if (!event) return errorResponse("Evento não encontrado", 404);
    return Response.json({ ...event, phase: getEventPhase(event) });
  } catch (error) {
    console.error("Current event lookup failed", error);
    return errorResponse("Não foi possível carregar o evento", 500);
  }
}
