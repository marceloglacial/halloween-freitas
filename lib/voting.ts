export function isEligibleCandidate(
  category: Pick<Category, "eligibility">,
  candidate: Pick<PublicUser, "_id" | "group" | "junior">,
  voterId?: string,
) {
  if (voterId && candidate._id === voterId) return false;
  if (category.eligibility === "group") return Boolean(candidate.group);
  if (category.eligibility === "junior") return Boolean(candidate.junior);
  return true;
}
