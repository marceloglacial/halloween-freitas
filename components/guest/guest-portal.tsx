import Link from "next/link";
import ContestPhotoUpload from "@/components/guest/contest-photo-upload";
import IndividualEntryControls from "@/components/guest/individual-entry-controls";
import GroupEntryControls from "@/components/guest/group-entry-controls";
import JuniorEntryControls from "@/components/guest/junior-entry-controls";
import { isVotingOpen } from "@/lib/events";
import type { OwnedContestantEntry } from "@/lib/contestant-entries";
import { getContestEntryState } from "@/util/contest-entry-state";

const entryTypeLabels: Record<ContestantEntryType, string> = {
  individual: "Fantasia individual",
  junior: "Fantasia infantil",
  group: "Fantasia em grupo",
};

const entryStatusLabels: Record<ContestantEntryStatus, string> = {
  draft: "Rascunho",
  ready: "Pronta para avaliação",
  locked: "Inscrição congelada para votação",
  withdrawn: "Inscrição retirada",
};

function formatEventStart(event: HalloweenEvent) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: event.timezone,
  }).format(new Date(event.eventStartsAt));
}

export default function GuestPortal({
  event,
  guestName,
  entries,
  categories,
  votedCategoryIds,
  now,
}: {
  event: HalloweenEvent;
  guestName: string;
  entries: (OwnedContestantEntry & { photoUrl?: string | null })[];
  categories: Category[];
  votedCategoryIds: string[];
  now: string;
}) {
  const entryState = getContestEntryState(event, new Date(now));
  const eventStarted =
    new Date(now).getTime() >= new Date(event.eventStartsAt).getTime();
  const votingOpen = isVotingOpen(event) && eventStarted;
  const individualEntry =
    entries.find((entry) => entry.entryType === "individual") ?? null;
  const groupEntry =
    entries.find((entry) => entry.entryType === "group") ?? null;
  const individualCategories = categories.filter(
    (category) => category.eligibility === "all",
  );
  const juniorCategories = categories.filter(
    (category) => category.eligibility === "junior",
  );
  const groupCategories = categories.filter(
    (category) => category.eligibility === "group",
  );
  const voted = new Set(votedCategoryIds);
  const entryMessage =
    entryState === "open"
      ? "As inscrições do concurso estão abertas nesta edição."
      : entryState === "upcoming"
        ? `As inscrições abrem em ${formatEventStart({ ...event, eventStartsAt: event.registrationStartsAt })}.`
        : "As inscrições do concurso estão encerradas nesta edição.";
  const votingMessage = votingOpen
    ? "A votação está aberta. Escolha uma categoria para votar."
    : event.votingStatus === "ended"
      ? "A votação desta edição foi encerrada."
      : eventStarted
        ? "A votação ainda não foi aberta pela organização."
        : `O evento começa em ${formatEventStart(event)}.`;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 px-4 py-12 text-white sm:px-8 lg:py-16">
      <header className="grid gap-3 text-center">
        <p className="text-5xl" aria-hidden="true">
          🎃
        </p>
        <p className="text-orange-300">
          {event.title} · {event.year}
        </p>
        <h1 className="text-5xl lg:text-7xl">Meu Halloween</h1>
        <p className="text-lg text-stone-300">
          Olá, {guestName}. Acompanhe sua edição, suas inscrições e a votação.
        </p>
      </header>

      <section
        aria-labelledby="edition-heading"
        className="grid gap-4 rounded-2xl border border-white/10 bg-stone-900 p-5 sm:grid-cols-2 sm:p-7"
      >
        <div className="grid content-start gap-2">
          <h2 id="edition-heading" className="text-2xl font-semibold">
            Sua edição
          </h2>
          <p>
            {event.status === "active" ? "Edição ativa" : "Edição arquivada"}
          </p>
          <Link
            href={`/perfil?eventId=${event._id}`}
            className="mt-2 w-fit text-orange-300 underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-300"
          >
            Consultar presença e atualizar meu perfil
          </Link>
        </div>
        <div className="grid content-start gap-2 border-t border-white/10 pt-4 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-6">
          <h2 className="text-xl font-semibold">Inscrições do concurso</h2>
          <p role="status">{entryMessage}</p>
          {entryState === "closed" &&
          event.votingStatus === "not_started" &&
          event.status === "active" ? (
            <p className="text-sm text-stone-300">
              A presença no evento continua válida mesmo com as inscrições
              encerradas.
            </p>
          ) : null}
        </div>
      </section>

      <section aria-labelledby="entries-heading" className="grid gap-4">
        <div>
          <h2 id="entries-heading" className="text-3xl font-semibold">
            Minhas inscrições
          </h2>
          <p className="mt-1 text-stone-300">
            As inscrições abaixo pertencem somente a esta edição.
          </p>
        </div>
        <IndividualEntryControls
          eventId={event._id}
          categories={individualCategories}
          entry={individualEntry}
          enabled={entryState === "open"}
        />
        <JuniorEntryControls
          eventId={event._id}
          categories={juniorCategories}
          enabled={entryState === "open"}
        />
        <GroupEntryControls
          eventId={event._id}
          categories={groupCategories}
          entry={groupEntry}
          enabled={entryState === "open"}
        />
        {entries.length ? (
          <ul className="grid gap-4 md:grid-cols-2">
            {entries.map((entry) => {
              const category = categories.find(
                (item) => item._id === entry.categoryId,
              );
              return (
                <li
                  key={entry._id}
                  className="grid gap-2 rounded-2xl border border-white/10 bg-zinc-900 p-5"
                >
                  <p className="text-sm text-orange-300">
                    {entryTypeLabels[entry.entryType]}
                  </p>
                  <h3 className="text-xl font-semibold">{entry.displayName}</h3>
                  <p className="text-stone-300">
                    {category?.icon ? `${category.icon} ` : ""}
                    {category?.title ?? "Categoria"}
                  </p>
                  <p className="text-sm text-stone-400">
                    {entryStatusLabels[entry.status]}
                  </p>
                  <ContestPhotoUpload
                    eventId={event._id}
                    entryId={entry._id}
                    entryType={entry.entryType}
                    initialPhotoUrl={entry.photoUrl ?? null}
                    enabled={
                      entryState === "open" &&
                      entry.status !== "locked" &&
                      entry.status !== "withdrawn"
                    }
                  />
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="rounded-2xl border border-white/10 bg-zinc-900 p-5 text-stone-300">
            Você ainda não tem inscrições neste evento. Sua presença está
            confirmada independentemente de participar do concurso.
          </p>
        )}
      </section>

      <section aria-labelledby="voting-heading" className="grid gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="voting-heading" className="text-3xl font-semibold">
              Categorias
            </h2>
            <p role="status" className="mt-1 text-stone-300">
              {votingMessage}
            </p>
          </div>
          {votingOpen ? (
            <Link
              href={`/votacao/categories?eventId=${event._id}`}
              className="w-fit rounded-xl bg-orange-400 px-5 py-3 font-semibold text-black hover:bg-orange-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300"
            >
              Ir para votação
            </Link>
          ) : null}
        </div>
        {categories.length ? (
          <ul className="grid gap-3 sm:grid-cols-2">
            {categories.map((category) => {
              const alreadyVoted = voted.has(category._id);
              const unavailable = !votingOpen || alreadyVoted;
              const label = alreadyVoted
                ? `${category.title} — voto registrado`
                : category.title;
              return (
                <li key={category._id}>
                  {unavailable ? (
                    <div
                      aria-disabled="true"
                      className="flex min-h-20 items-center gap-4 rounded-xl bg-gray-700 p-4 text-stone-300"
                    >
                      <span className="text-4xl" aria-hidden="true">
                        {category.icon}
                      </span>
                      <span>
                        {label}
                        {alreadyVoted ? (
                          <span className="block text-sm">Voto registrado</span>
                        ) : null}
                      </span>
                    </div>
                  ) : (
                    <Link
                      href={`/votacao/categories/${category._id}?eventId=${event._id}`}
                      className="flex min-h-20 items-center gap-4 rounded-xl bg-purple-600 p-4 hover:bg-purple-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300"
                    >
                      <span className="text-4xl" aria-hidden="true">
                        {category.icon}
                      </span>
                      <span>{label}</span>
                      <span className="ml-auto text-sm">Votar →</span>
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="rounded-2xl border border-white/10 bg-zinc-900 p-5 text-stone-300">
            Nenhuma categoria foi configurada para esta edição.
          </p>
        )}
      </section>

      <Link
        href="/"
        className="w-fit text-orange-300 underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-300"
      >
        Voltar ao início
      </Link>
    </main>
  );
}
