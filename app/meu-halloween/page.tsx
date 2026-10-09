import { ObjectId } from "mongodb";
import { redirect } from "next/navigation";
import GuestPortal from "@/components/guest/guest-portal";
import FeatureUnavailable from "@/components/feature-unavailable";
import {
  getGuestRegistration,
  GuestAccessError,
} from "@/lib/auth/guest-registration";
import { getContestantEntriesForRsvp } from "@/lib/contestant-entries";
import { contestPhotoPreviewUrl } from "@/lib/contestant-photos";
import { getDb } from "@/lib/db";
import { getCurrentEvent, getEventById, isVotingOpen } from "@/lib/events";
import { guestAccessUrl, validGuestEventId } from "@/util/guest-access";
import { getCategories } from "@/util/get-categories";

export const dynamic = "force-dynamic";

type VoteDocument = { categoryId: ObjectId };

export default async function MeuHalloweenPage({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string }>;
}) {
  const query = await searchParams;
  if (query.eventId !== undefined && !validGuestEventId(query.eventId)) {
    return (
      <FeatureUnavailable
        title="Evento inválido"
        message="Confira o link da edição e tente novamente."
      />
    );
  }

  const event = query.eventId
    ? await getEventById(query.eventId)
    : await getCurrentEvent();
  if (!event) {
    return (
      <FeatureUnavailable
        title="Evento não encontrado"
        message="Não encontramos uma edição para mostrar."
      />
    );
  }

  let guest;
  try {
    guest = await getGuestRegistration(event._id);
  } catch (error) {
    if (!(error instanceof GuestAccessError)) throw error;
    if (["signed_out", "unlinked", "unverified"].includes(error.code)) {
      const returnTo = `/meu-halloween?eventId=${event._id}`;
      redirect(guestAccessUrl(event._id, returnTo));
    }
    return (
      <FeatureUnavailable title="Acesso indisponível" message={error.message} />
    );
  }

  const now = new Date();
  const votingOpen =
    isVotingOpen(event) &&
    now.getTime() >= new Date(event.eventStartsAt).getTime();
  const [entries, categories, votes] = await Promise.all([
    getContestantEntriesForRsvp(event._id, guest.userId),
    getCategories(event._id),
    votingOpen
      ? (await getDb())
          .collection<VoteDocument>("votes")
          .find(
            {
              eventId: new ObjectId(event._id),
              voterId: new ObjectId(guest.userId),
            },
            { projection: { categoryId: 1 } },
          )
          .toArray()
      : Promise.resolve([]),
  ]);
  const portalEntries = entries.map(({ contestPhoto, ...entry }) => ({
    ...entry,
    photoUrl: contestPhoto
      ? contestPhotoPreviewUrl(contestPhoto.publicId, contestPhoto.format)
      : null,
  }));

  return (
    <GuestPortal
      event={event}
      guestName={guest.fullName}
      entries={portalEntries}
      categories={categories}
      votedCategoryIds={votes.map((vote) => vote.categoryId.toString())}
      now={now.toISOString()}
    />
  );
}
