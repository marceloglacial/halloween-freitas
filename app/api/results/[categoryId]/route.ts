import { getEventBySlug, resultsArePublic } from "@/lib/events";
import { errorResponse, parseObjectId, logServerError } from "@/lib/http";
import { getCategoryResults } from "@/lib/results";
import {
  getFinalVotingRoundForCategory,
  getOpenVotingRound,
  roundIncludesCategory,
} from "@/lib/voting-rounds";
import { getCategoryById } from "@/util/get-categories";
import { isAdmin } from "@/lib/auth/admin";

function noStore(response: Response) {
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ categoryId: string }> },
) {
  try {
    const categoryId = parseObjectId((await context.params).categoryId);
    if (!categoryId) return noStore(errorResponse("Categoria inválida", 400));

    const category = await getCategoryById(categoryId.toString());
    if (!category) {
      return noStore(errorResponse("Categoria não encontrada", 404));
    }

    const eventSlug = new URL(request.url).searchParams.get("event");
    const event = eventSlug ? await getEventBySlug(eventSlug) : null;
    const admin = event && !resultsArePublic(event) ? await isAdmin() : false;
    if (
      !event ||
      event._id !== category.eventId ||
      (!resultsArePublic(event) && !admin)
    ) {
      return noStore(errorResponse("Resultados ainda não publicados", 403));
    }

    const openRound = admin ? await getOpenVotingRound(event._id) : null;
    const round =
      openRound &&
      roundIncludesCategory(openRound, event._id, categoryId.toString())
        ? openRound
        : await getFinalVotingRoundForCategory(
            event._id,
            categoryId.toString(),
          );
    if (!round) {
      return noStore(Response.json({ users: [], totalVotes: 0 }));
    }
    return noStore(
      Response.json(
        await getCategoryResults(
          event._id,
          categoryId.toString(),
          round._id.toString(),
        ),
      ),
    );
  } catch (error) {
    logServerError("Result lookup failed", error);
    return noStore(
      errorResponse("Não foi possível carregar os resultados", 500),
    );
  }
}
