import { getActiveEvent, getEventPhase } from "@/lib/events";
import { errorResponse, logServerError } from "@/lib/http";
import { getCategories } from "@/util/get-categories";

function noStoreError(message: string, status: number) {
  const response = errorResponse(message, status);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET() {
  try {
    const event = await getActiveEvent();
    if (!event) return noStoreError("Evento não encontrado", 404);
    const categories = await getCategories(event._id);
    return Response.json(
      { ...event, phase: getEventPhase(event), categories },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    logServerError("Current event lookup failed", error);
    return noStoreError("Não foi possível carregar o evento", 500);
  }
}
