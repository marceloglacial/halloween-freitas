export function isEligibleCandidate(
  category: Pick<Category, "eligibility">,
  candidate: Pick<PublicUser, "_id" | "group"> & {
    contestant?: boolean;
  },
) {
  if (candidate.contestant === false) return false;
  if (category.eligibility === "group") return Boolean(candidate.group);
  return true;
}
