import { ObjectId } from "mongodb";
import { isAdmin } from "@/lib/auth/admin";
import { getDb } from "@/lib/db";
import { getCategories } from "@/util/get-categories";
import { getEventById } from "@/lib/events";
import { errorResponse, logServerError } from "@/lib/http";
import { getCategoryResults } from "@/lib/results";
import {
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
    const rounds = await (await getDb())
      .collection("votingRounds")
      .find({ eventId: new ObjectId(event._id) })
      .sort({ openedAt: 1 })
      .toArray();
    const results = await Promise.all(categories.map(async (category) => {
      const categoryRounds = rounds.filter((round) =>
        roundIncludesCategory(round as never, event._id, category._id),
      );
      const displayedRounds = categoryRounds.filter((round) =>
        round.type === "primary" ||
        (round.type === "runoff" &&
          (round.status === "open" || !openRound ||
            !roundIncludesCategory(openRound, event._id, category._id))),
      );
      const tallies = await Promise.all(displayedRounds.map(async (round) => {
        const tally = await getCategoryResults(event._id, category._id, round._id.toString());
        const runoffCandidateIds = round.type === "runoff"
          ? round.candidateIdsByCategory?.find((scope) => scope.categoryId.toString() === category._id)?.candidateIds.map((candidateId) => candidateId.toString()) ?? []
          : null;
        return {
          roundId: round._id.toString(),
          roundType: round.type,
          roundStatus: round.status,
          totalVotes: tally.totalVotes,
          users: tally.users
            .filter((user) => runoffCandidateIds === null || runoffCandidateIds.includes(user._id))
            .map(({ _id, fullName, votes }) => ({ _id, fullName, votes })),
        };
      }));
      return { categoryId: category._id, title: category.title, icon: category.icon, rounds: tallies };
    }));
    const displayedRoundIds = [
      ...new Set(
        results.flatMap((result) => result.rounds.map((round) => round.roundId)),
      ),
    ].map((roundId) => new ObjectId(roundId));
    const participants = displayedRoundIds.length
      ? await (await getDb()).collection("votes").distinct("voterRsvpId", {
          eventId: new ObjectId(event._id),
          roundId: { $in: displayedRoundIds },
        })
      : [];

    return Response.json(
      {
        eventId: event._id,
        votingStatus: event.votingStatus,
        resultsPublished: event.resultsPublished,
        participantCount: participants.length,
        categories: results.map((category) => ({
          categoryId: category.categoryId,
          title: category.title,
          icon: category.icon,
          rounds: category.rounds,
        })),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    logServerError("Admin results lookup failed", error);
    return errorResponse("Não foi possível carregar a apuração", 500);
  }
}
