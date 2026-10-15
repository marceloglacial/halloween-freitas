import Link from "next/link";
import { getRegistrationState } from "@/lib/events";
import type { EventOverview } from "@/lib/admin-event-overview";

function dateLabel(value: string, timezone: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: timezone,
  }).format(new Date(value));
}

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <p className="text-sm text-gray-300">{label}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums">
        {value.toLocaleString("pt-BR")}
      </p>
      <p className="mt-1 text-xs text-gray-400">{detail}</p>
    </article>
  );
}

export default function AdminEventOverview({
  event,
  overview,
  now,
}: {
  event: HalloweenEvent;
  overview: EventOverview;
  now: Date;
}) {
  const year = event.year;
  const registration = getRegistrationState(event, now);
  const eventStarted = new Date(event.eventStartsAt) <= now;
  const primaryAction =
    event.votingStatus === "open"
      ? { label: "Acompanhar votação", href: `/dashboard/votacao?year=${year}` }
      : event.votingStatus === "ended" && !event.resultsPublished
        ? {
            label: "Publicar resultados",
            href: `/dashboard/votacao?year=${year}`,
          }
        : event.votingStatus === "ended"
          ? {
              label: "Gerenciar álbum da festa",
              href: `/dashboard/galeria?year=${year}`,
            }
          : eventStarted
            ? {
                label: "Preparar votação",
                href: `/dashboard/votacao?year=${year}`,
              }
            : registration === "open"
              ? {
                  label: "Acompanhar confirmações",
                  href: `/dashboard/convidados?year=${year}`,
                }
              : {
                  label: "Configurar edição",
                  href: `/dashboard/configuracoes?year=${year}`,
                };
  const milestone =
    event.votingStatus === "open"
      ? { title: "Encerrar a votação", at: null as string | null }
      : event.votingStatus === "ended" && !event.resultsPublished
        ? { title: "Publicar os resultados", at: null }
        : event.votingStatus === "ended"
          ? { title: "Edição concluída", at: null }
          : registration === "upcoming"
            ? {
                title: "Abertura das confirmações",
                at: event.registrationStartsAt,
              }
            : { title: "Início da festa", at: event.eventStartsAt };

  const checklist = [
    {
      label: "Categorias do concurso",
      detail: `${overview.categories} configuradas`,
      done: overview.categories > 0,
      href: `/dashboard/configuracoes?year=${year}`,
    },
    {
      label: "Participantes elegíveis",
      detail: `${overview.eligibleContestants} prontos para votação`,
      done: overview.eligibleContestants > 0,
      href: `/dashboard/concursos?year=${year}`,
    },
    {
      label: "Confirmações de presença",
      detail:
        registration === "upcoming"
          ? `Abrem em ${dateLabel(event.registrationStartsAt, event.timezone)}`
          : registration === "open"
            ? "Recebendo confirmações"
            : "Encerradas nesta edição",
      done: registration !== "upcoming",
      href: `/dashboard/convidados?year=${year}`,
    },
    {
      label: "Votação",
      detail:
        event.votingStatus === "open"
          ? "Em andamento"
          : event.votingStatus === "ended"
            ? "Encerrada"
            : eventStarted
              ? "Pronta para abertura pelo administrador"
              : `Festa em ${dateLabel(event.eventStartsAt, event.timezone)}`,
      done: event.votingStatus !== "not_started",
      href: `/dashboard/votacao?year=${year}`,
    },
    {
      label: "Resultados",
      detail: event.resultsPublished
        ? "Publicados"
        : event.votingStatus === "ended"
          ? "Aguardando publicação"
          : "Aguardando o encerramento da votação",
      done: event.resultsPublished,
      href: `/dashboard/votacao?year=${year}`,
    },
    {
      label: "Álbum da festa",
      detail: overview.albumPublished
        ? `${overview.partyPhotos} fotos publicadas`
        : overview.partyPhotos > 0
          ? `${overview.partyPhotos} fotos aguardam publicação`
          : "Sem fotos enviadas",
      done: overview.albumPublished,
      href: `/dashboard/galeria?year=${year}`,
    },
  ];
  const actions = [
    ...(overview.categories === 0
      ? [
          {
            label: "Configurar categorias",
            href: `/dashboard/configuracoes?year=${year}`,
          },
        ]
      : []),
    ...(overview.eligibleContestants === 0
      ? [
          {
            label: "Revisar participantes",
            href: `/dashboard/concursos?year=${year}`,
          },
        ]
      : []),
    ...(event.votingStatus === "not_started" && eventStarted
      ? [{ label: "Preparar votação", href: `/dashboard/votacao?year=${year}` }]
      : []),
    ...(event.votingStatus === "open"
      ? [
          {
            label: "Acompanhar votação",
            href: `/dashboard/votacao?year=${year}`,
          },
        ]
      : []),
    ...(event.votingStatus === "ended" && !event.resultsPublished
      ? [
          {
            label: "Publicar resultados",
            href: `/dashboard/votacao?year=${year}`,
          },
        ]
      : []),
    ...(!overview.albumPublished
      ? [
          {
            label: "Gerenciar álbum da festa",
            href: `/dashboard/galeria?year=${year}`,
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-orange-400/20 bg-gradient-to-br from-orange-500/10 via-stone-950 to-stone-950 p-6 sm:p-8">
        <p className="text-xs font-semibold tracking-[0.2em] text-orange-300 uppercase">
          Visão geral · edição {year} ·{" "}
          {event.status === "active" ? "ativa" : "arquivada"}
        </p>
        <h2 className="mt-3 text-2xl font-semibold sm:text-3xl">
          {event.title}
        </h2>
        <p className="mt-2 text-sm text-gray-300">
          Festa: {dateLabel(event.eventStartsAt, event.timezone)}{" "}
          <span className="text-gray-500">({event.timezone})</span>
        </p>
        <div className="mt-6 grid gap-4 rounded-xl border border-white/10 bg-black/30 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <p className="text-xs font-medium tracking-wide text-gray-400 uppercase">
              Próximo marco
            </p>
            <p className="mt-1 text-lg font-semibold">{milestone.title}</p>
            {milestone.at && (
              <p className="mt-1 text-sm text-gray-300">
                {dateLabel(milestone.at, event.timezone)} · {event.timezone}
              </p>
            )}
          </div>
          <Link
            href={primaryAction.href}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-black hover:bg-orange-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300"
          >
            {primaryAction.label}
          </Link>
        </div>
      </section>

      <section
        aria-label="Indicadores da edição"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <Metric
          label="Presenças confirmadas"
          value={overview.confirmedRsvps}
          detail="Inscrições não canceladas"
        />
        <Metric
          label="Participantes elegíveis"
          value={overview.eligibleContestants}
          detail="Inscrições completas para o concurso"
        />
        <Metric
          label="Votos registrados"
          value={overview.votes}
          detail="Cédulas desta edição, incluindo desempate"
        />
        <Metric
          label="Categorias"
          value={overview.categories}
          detail="Categorias configuradas para a edição"
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.7fr)]">
        <section className="rounded-2xl border border-white/10 bg-stone-950/80 p-5 sm:p-6">
          <h3 className="text-lg font-semibold">Checklist da edição</h3>
          <ul className="mt-4 divide-y divide-white/10">
            {checklist.map((item) => (
              <li key={item.label} className="flex items-start gap-3 py-3">
                <span
                  aria-label={item.done ? "Concluído" : "Pendente"}
                  className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-sm ${item.done ? "bg-emerald-400/15 text-emerald-300" : "bg-amber-400/10 text-amber-200"}`}
                >
                  {item.done ? "✓" : "•"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{item.label}</p>
                  <p className="mt-0.5 text-sm text-gray-400">{item.detail}</p>
                </div>
                <Link
                  href={item.href}
                  className="rounded-lg px-2 py-1 text-sm text-orange-300 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-orange-300"
                >
                  Ver
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-2xl border border-white/10 bg-stone-950/80 p-5 sm:p-6">
          <h3 className="text-lg font-semibold">Próximas ações</h3>
          {actions.length ? (
            <ul className="mt-4 grid gap-2">
              {actions.map((action) => (
                <li key={action.label}>
                  <Link
                    href={action.href}
                    className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-medium hover:border-orange-400/40 hover:bg-orange-500/5 focus-visible:outline-2 focus-visible:outline-orange-300"
                  >
                    {action.label}
                    <span aria-hidden="true" className="text-orange-300">
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 rounded-xl bg-white/[0.03] p-4 text-sm text-gray-300">
              Nenhuma ação prioritária para esta edição no momento.
            </p>
          )}
          <p className="mt-5 text-xs text-gray-500">
            Álbum da festa: {overview.partyPhotos}{" "}
            {overview.partyPhotos === 1 ? "foto" : "fotos"} ·{" "}
            {overview.albumPublished ? "publicado" : "não publicado"}
          </p>
        </section>
      </div>
    </div>
  );
}
