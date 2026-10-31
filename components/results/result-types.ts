export interface RankedResult {
  user: UserWithVotes;
  position: number;
}

export interface PodiumPlace {
  position: 1 | 2 | 3;
  entries: RankedResult[];
  skippedByTie: boolean;
}
