import { ObjectId } from "mongodb";
import { isAdmin } from "@/lib/auth/admin";
import { getCategories } from "@/util/get-categories";
import { getEventById } from "@/lib/events";
import { errorResponse, logServerError } from "@/lib/http";
import { getCategoryResults } from "@/lib/results";
import {
  getFinalVotingRoundForCategory,
  getOpenVotingRound,
  roundIncludesCategory,
} from "@/lib/voting-rounds";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin())) return errorResponse("Não autorizado", 401);

  const { id } = await context.params;
  if (!ObjectId.isValid(id)) return errorResponse("Evento inválido", 400);

  try {
    const event = await getEventById(id);
    if (!event) return errorResponse("Evento não encontrado", 404);

    const [categories, openRound] = await Promise.all([
      getCategories(event._id),
      getOpenVotingRound(event._id),
    ]);
    const results = await Promise.all(
      categories.map(async (category) => {
        const round =
          openRound && roundIncludesCategory(openRound, event._id, category._id)
            ? openRound
            : await getFinalVotingRoundForCategory(event._id, category._id);
        if (!round) {
          return {
            categoryId: category._id,
            title: category.title,
            icon: category.icon,
            roundType: null,
            roundStatus: null,
            totalVotes: 0,
            users: [],
          };
        }

        const tally = await getCategoryResults(
          event._id,
          category._id,
          round._id.toString(),
        );
        return {
          categoryId: category._id,
          title: category.title,
          icon: category.icon,
          roundType: round.type,
          roundStatus: round.status,
          totalVotes: tally.totalVotes,
          users: tally.users.map(({ _id, fullName, votes }) => ({
            _id,
            fullName,
            votes,
          })),
        };
      }),
    );

    return Response.json(
      {
        eventId: event._id,
        votingStatus: event.votingStatus,
        resultsPublished: event.resultsPublished,
        categories: results,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    logServerError("Admin results lookup failed", error);
    return errorResponse("Não foi possível carregar a apuração", 500);
  }
}
