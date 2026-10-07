import { GuestAccessError } from "@/lib/auth/guest-registration";
import { getVotingGuest } from "@/lib/auth/voting-guest";
import { getCategoryById } from "@/util/get-categories";
import { errorResponse, logServerError } from "@/lib/http";
import { getPublicVotingUsersForEvent } from "@/lib/users";
import { isEligibleCandidate } from "@/lib/voting";

export async function GET(request: Request) {
  try {
    const session = await getVotingGuest(
      new URL(request.url).searchParams.get("eventId") ?? undefined,
    );

    const categoryId = new URL(request.url).searchParams.get("categoryId");
    const category = categoryId ? await getCategoryById(categoryId) : null;
    if (!category || category.eventId !== session.eventId) {
      return errorResponse("Categoria não encontrada", 404);
    }

    const users = await getPublicVotingUsersForEvent(session.eventId);
    const candidates = users.filter((user) =>
      isEligibleCandidate(category, user, session.userId),
    );
    return Response.json(candidates);
  } catch (error) {
    if (error instanceof GuestAccessError)
      return errorResponse(error.message, error.status);
    logServerError("Candidate lookup failed", error);
    return errorResponse("Não foi possível carregar os candidatos", 500);
  }
}
