type ContestantEntryType = "individual" | "junior" | "group";

type ContestantEntryStatus = "draft" | "ready" | "locked" | "withdrawn";

type PublicContestantEntry = {
  _id: string;
  eventId: string;
  categoryId: string;
  entryType: ContestantEntryType;
  displayName: string;
};

type VotingCandidate = {
  _id: string;
  eventId: string;
  fullName: string;
  imageUrl: string;
};
