import Link from "next/link";
import AdminAccessDenied from "@/components/dashboard/admin-access-denied";
import AdminEventContests from "@/components/dashboard/admin-event-contests";
import AdminPartyAlbum from "@/components/dashboard/admin-party-album";
import AdminVoting from "@/components/dashboard/admin-voting";
import { authorizeAdminPage } from "@/lib/auth/admin-page";
import { resolveAdminEvent } from "@/lib/admin-event-selection";
import { getEvents } from "@/lib/events";
import { getAdminParticipantRsvpIdsForEvent } from "@/lib/contestant-entries";
import { countConfirmedRsvpsForEvent } from "@/lib/users";
import { getOpenVotingRound } from "@/lib/voting-rounds";

export type AdminEventFeature = "contests" | "voting" | "gallery";

const featureRoute: Record<AdminEventFeature, string> = {
  contests: "/dashboard/concursos",
  voting: "/dashboard/votacao",
  gallery: "/dashboard/galeria",
};

const featureTitle: Record<AdminEventFeature, string> = {
  contests: "Concursos",
  voting: "Votação",
  gallery: "Galeria",
};

export default async function AdminEventFeaturePage({
  searchParams,
  feature,
}: {
  searchParams: Promise<{ year?: string | string[] }>;
  feature: AdminEventFeature;
}) {
  const returnBackUrl = featureRoute[feature];
  if (!(await authorizeAdminPage(returnBackUrl))) return <AdminAccessDenied />;

  const [events, query] = await Promise.all([getEvents(), searchParams]);
  const requestedYear = Array.isArray(query.year) ? query.year[0] : query.year;
  const selection = resolveAdminEvent(events, requestedYear);
  const event = selection.event
    ? (events.find((item) => item.year === selection.event?.year) ?? null)
    : null;

  if (!event) {
    return (
      <section className="rounded-2xl border border-white/10 bg-stone-950/80 p-5 sm:p-6">
        <h1 className="text-4xl text-orange-300 sm:text-5xl">
          {featureTitle[feature]}
        </h1>
        <h2 className="mt-4 text-xl font-semibold">
          Nenhuma edição disponível
        </h2>
        <p className="mt-2 text-gray-300">
          Crie uma edição em Configurações antes de administrar esta área.
        </p>
        <Link
          href="/dashboard/configuracoes"
          className="mt-4 inline-flex rounded-lg bg-orange-500 px-4 py-2 font-semibold text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300"
        >
          Abrir configurações
        </Link>
      </section>
    );
  }

  if (feature === "contests") {
    const [participantIds, confirmedRsvps] = await Promise.all([
      getAdminParticipantRsvpIdsForEvent(event._id),
      countConfirmedRsvpsForEvent(event._id),
    ]);
    return (
      <AdminEventContests
        key={event._id}
        event={event}
        participantCount={participantIds.length}
        confirmedRsvps={confirmedRsvps}
        now={new Date().toISOString()}
      />
    );
  }
  if (feature === "voting") {
    const openRound = await getOpenVotingRound(event._id);
    return (
      <AdminVoting
        key={event._id}
        event={event}
        openRoundType={openRound?.type ?? null}
        now={new Date().toISOString()}
      />
    );
  }
  return <AdminPartyAlbum key={event._id} event={event} />;
}
