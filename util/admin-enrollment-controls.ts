import { getContestEntryState } from "@/util/contest-entry-state";
import { getRegistrationState } from "@/util/registration-state";

export function getAdminEnrollmentControls(
  event: HalloweenEvent,
  now = new Date(),
) {
  const rsvpState = getRegistrationState(event, now);
  const contestantState = getContestEntryState(event, now);

  let contestantMembershipDisabledReason: string | null = null;
  if (event.status !== "active") {
    contestantMembershipDisabledReason =
      "Ative esta edição para incluir ou remover participantes.";
  } else if (event.votingStatus !== "not_started") {
    contestantMembershipDisabledReason =
      "A primeira abertura da votação encerra permanentemente novas confirmações de presença e inclusões ou exclusões de participantes.";
  } else if (contestantState === "upcoming") {
    contestantMembershipDisabledReason =
      "A inclusão e remoção de participantes abre no início programado das inscrições.";
  } else if (contestantState === "closed") {
    contestantMembershipDisabledReason =
      "As inscrições do concurso estão fechadas. Reabra-as antes de incluir ou remover participantes.";
  }

  return {
    rsvpState,
    contestantState,
    canChangeContestantMembership: contestantState === "open",
    contestantMembershipDisabledReason,
  };
}
