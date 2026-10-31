import { ObjectId } from "mongodb";
import type {
  BallotDocument,
  VotingRoundCandidateScope,
} from "@/lib/voting-rounds";

export function findFirstPlaceTies(
  categoryIds: ObjectId[],
  ballots: Pick<BallotDocument, "categoryId" | "candidateId">[],
): VotingRoundCandidateScope[] {
  const candidateCounts = new Map<string, Map<string, number>>();

  for (const ballot of ballots) {
    const categoryKey = ballot.categoryId.toString();
    const candidateKey = ballot.candidateId.toString();
    const counts =
      candidateCounts.get(categoryKey) ?? new Map<string, number>();
    counts.set(candidateKey, (counts.get(candidateKey) ?? 0) + 1);
    candidateCounts.set(categoryKey, counts);
  }

  const tiedCandidates: VotingRoundCandidateScope[] = [];
  for (const categoryId of categoryIds) {
    const counts = candidateCounts.get(categoryId.toString());
    if (!counts?.size) continue;
    const maxVotes = Math.max(...counts.values());
    const candidateIds = [...counts.entries()]
      .filter(([, votes]) => votes === maxVotes)
      .map(([candidateId]) => new ObjectId(candidateId));
    if (candidateIds.length > 1) {
      tiedCandidates.push({ categoryId, candidateIds });
    }
  }

  return tiedCandidates;
}
