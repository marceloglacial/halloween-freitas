import { getEventBySlug, resultsArePublic } from "@/lib/events";
import { errorResponse, parseObjectId } from "@/lib/http";
import { getCategoryResults } from "@/lib/results";
import { getCategoryById } from "@/util/get-categories";

export async function GET(
  request: Request,
  context: { params: Promise<{ categoryId: string }> },
) {
  try {
    const categoryId = parseObjectId((await context.params).categoryId);
    if (!categoryId) return errorResponse("Categoria inválida", 400);

    const category = await getCategoryById(categoryId.toString());
    if (!category) return errorResponse("Categoria não encontrada", 404);

    const eventSlug = new URL(request.url).searchParams.get("event");
    const event = eventSlug ? await getEventBySlug(eventSlug) : null;
    if (!event || event._id !== category.eventId || !resultsArePublic(event)) {
      return errorResponse("Resultados ainda não publicados", 403);
    }

    return Response.json(
      await getCategoryResults(event._id, categoryId.toString()),
    );
  } catch (error) {
    console.error("Result lookup failed", error);
    return errorResponse("Não foi possível carregar os resultados", 500);
  }
}
