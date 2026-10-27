import React, { FC, JSX } from "react";
import { ResultsReveal } from "./results-reveal";
import { getPodiumRevealSequence } from "./result-ranking";

export {
  getPodiumEntryRevealState,
  getPodiumRevealSequence,
  getRevealedResultIds,
  getVisiblePodiumEntries,
} from "./result-ranking";

interface ResultListProps extends Results {
  eventTitle: string;
  categoryTitle: string;
}

export const ResultList: FC<ResultListProps> = ({
  users,
  totalVotes,
  eventTitle,
  categoryTitle,
}): JSX.Element => {
  const positionByVotes = new Map<number, number>();
  users.forEach((user, index) => {
    if (!positionByVotes.has(user.votes)) {
      positionByVotes.set(user.votes, index + 1);
    }
  });
  const rankedUsers = users.map((user) => ({
    user,
    position: positionByVotes.get(user.votes)!,
  }));
  const podiumRevealSequence = getPodiumRevealSequence(rankedUsers);
  const podiumIds = new Set(podiumRevealSequence.map(({ user }) => user._id));
  const remainingUsers = rankedUsers.filter(
    ({ user }) => !podiumIds.has(user._id),
  );
  const tieCounts = new Map<number, number>();
  rankedUsers.forEach(({ position }) => {
    tieCounts.set(position, (tieCounts.get(position) ?? 0) + 1);
  });
  const podiumPositions = [2, 1, 3] as const;
  const podiumPlaces = podiumPositions.map((position) => ({
    position,
    entries: rankedUsers.filter((ranked) => ranked.position === position),
    skippedByTie: rankedUsers.some(
      (ranked) =>
        ranked.position < position && (tieCounts.get(ranked.position) ?? 0) > 1,
    ),
  }));

  return (
    <ResultsReveal
      categoryTitle={categoryTitle}
      eventTitle={eventTitle}
      podiumPlaces={podiumPlaces}
      podiumRevealSequence={podiumRevealSequence}
      remainingUsers={remainingUsers}
      totalVotes={totalVotes}
    />
  );
};
