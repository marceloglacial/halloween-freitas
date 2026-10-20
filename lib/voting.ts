export function isEligibleCandidate(
  category: Pick<Category, "eligibility">,
  candidate: Pick<PublicUser, "_id" | "group" | "junior"> & {
    contestant?: boolean;
  },
) {
  if (candidate.contestant === false) return false;
  if (category.eligibility === "group") return Boolean(candidate.group);
  if (category.eligibility === "junior") return Boolean(candidate.junior);
  return true;
}
