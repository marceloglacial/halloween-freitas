import type { RankedResult } from "./result-types";

export function getPodiumRevealSequence(
  rankedUsers: RankedResult[],
): RankedResult[] {
  return ([3, 2, 1] as const).flatMap((position) =>
    rankedUsers.filter((ranked) => ranked.position === position),
  );
}

export function getVisiblePodiumEntries(
  revealSequence: RankedResult[],
  revealedCount: number,
  position: number,
): RankedResult[] {
  return revealSequence
    .slice(0, revealedCount)
    .filter((ranked) => ranked.position === position);
}

export function getRevealedResultIds(
  podiumSequence: RankedResult[],
  revealedCount: number,
): Set<string> {
  return new Set(
    podiumSequence.slice(0, revealedCount).map(({ user }) => user._id),
  );
}

export interface PodiumEntryRevealState {
  showTrophy: boolean;
  showVotes: boolean;
  revealed: boolean;
}

export function getPodiumEntryRevealState(
  entryIndex: number,
  revealStep: number,
  entryCount: number,
): PodiumEntryRevealState {
  const completedEntries = Math.floor(revealStep / 2);
  if (entryIndex < completedEntries || revealStep >= entryCount * 2) {
    return { showTrophy: false, showVotes: true, revealed: true };
  }

  const activeEntryIndex = completedEntries;
  const activeStep = revealStep % 2;
  if (entryIndex !== activeEntryIndex) {
    return { showTrophy: true, showVotes: false, revealed: false };
  }

  return {
    showTrophy: true,
    showVotes: activeStep >= 1,
    revealed: false,
  };
}
