import { getGuestSession } from "@/lib/auth/guest-session";
import { getCategoryById } from "@/util/get-categories";
import { errorResponse } from "@/lib/http";
import { getPublicUsersForEvent } from "@/lib/users";
import { isEligibleCandidate } from "@/lib/voting";

export async function GET(request: Request) {
  try {
    const session = await getGuestSession();
    if (!session) return errorResponse("Sessão inválida", 401);

    const categoryId = new URL(request.url).searchParams.get("categoryId");
    const category = categoryId ? await getCategoryById(categoryId) : null;
    if (!category || category.eventId !== session.eventId) {
      return errorResponse("Categoria não encontrada", 404);
    }

    const users = await getPublicUsersForEvent(session.eventId);
    const candidates = users.filter((user) =>
      isEligibleCandidate(category, user, session.userId),
    );
    return Response.json(candidates);
  } catch (error) {
    console.error("Candidate lookup failed", error);
    return errorResponse("Não foi possível carregar os candidatos", 500);
  }
}
