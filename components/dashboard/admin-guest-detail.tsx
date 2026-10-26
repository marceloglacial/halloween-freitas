"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { getAdminEnrollmentControls } from "@/util/admin-enrollment-controls";

type GuestDetail = {
  _id: string;
  eventId: string;
  fullName: string;
  email: string;
  clerkUserId?: string;
  status?: "confirmed" | "cancelled";
};

type CandidateDetail = {
  _id: string;
  entryType: ContestantEntryType;
  displayName: string;
  costumeTitle?: string;
  status: ContestantEntryStatus;
  categoryTitle: string;
  categoryIcon: string;
  photoUrl: string | null;
};

type DetailResponse = { guest: GuestDetail; entries: CandidateDetail[] };

async function responseError(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;
  return body?.error || fallback;
}

export default function AdminGuestDetail({
  event,
  guestId,
  now,
  initialDetail,
}: {
  event: HalloweenEvent;
  guestId: string;
  now: string;
  initialDetail: DetailResponse | null;
}) {
  const router = useRouter();
  const isNew = guestId === "novo";
  const membership = getAdminEnrollmentControls(event, new Date(now));
  const [detail, setDetail] = useState<DetailResponse | null>(initialDetail);
  const [fullName, setFullName] = useState(initialDetail?.guest.fullName ?? "");
  const [email, setEmail] = useState(initialDetail?.guest.email ?? "");
  const [savedName, setSavedName] = useState(
    initialDetail?.guest.fullName ?? "",
  );
  const [savedEmail, setSavedEmail] = useState(
    initialDetail?.guest.email ?? "",
  );
  const [newPhoto, setNewPhoto] = useState<Record<string, File | null>>({});
  const [photoConsent, setPhotoConsent] = useState<Record<string, boolean>>({});
  const [individualTitle, setIndividualTitle] = useState("");
  const [individualPhoto, setIndividualPhoto] = useState<File | null>(null);
  const [individualConsent, setIndividualConsent] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupTitle, setGroupTitle] = useState("");
  const [pendingId, setPendingId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    if (isNew) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/admin/users/${guestId}?eventId=${encodeURIComponent(event._id)}`,
        { cache: "no-store" },
      );
      if (!response.ok)
        throw new Error(
          await responseError(
            response,
            "Não foi possível carregar o convidado.",
          ),
        );
      const result = (await response.json()) as DetailResponse;
      setError("");
      setDetail(result);
      setFullName(result.guest.fullName);
      setEmail(result.guest.email);
      setSavedName(result.guest.fullName);
      setSavedEmail(result.guest.email);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Não foi possível carregar o convidado.",
      );
    } finally {
      setLoading(false);
    }
  }, [event._id, guestId, isNew]);

  async function saveGuest(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setPendingId("guest");
    setError("");
    setMessage("");
    try {
      if (isNew) {
        const response = await fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventId: event._id, fullName, email }),
        });
        if (!response.ok)
          throw new Error(
            await responseError(
              response,
              "Não foi possível adicionar o convidado.",
            ),
          );
        const created = (await response.json()) as { _id: string };
        router.replace(
          `/dashboard/convidados/${created._id}?year=${event.year}`,
        );
        return;
      }
      const response = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: event._id,
          _id: guestId,
          fullName,
          email,
        }),
      });
      if (!response.ok)
        throw new Error(
          await responseError(response, "Não foi possível salvar os dados."),
        );
      setSavedName(fullName);
      setSavedEmail(email);
      setMessage("Dados do convidado salvos.");
      await load();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Não foi possível salvar os dados.",
      );
    } finally {
      setPendingId("");
    }
  }

  async function createGroupEntry(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    if (!detail || pendingId || !canMutateMembership) return;
    setPendingId("create-group");
    setError("");
    setMessage("");
    try {
      const response = await fetch(
        `/api/admin/events/${event._id}/guests/${guestId}/contestants`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ groupName, costumeTitle: groupTitle }),
        },
      );
      if (!response.ok)
        throw new Error(
          await responseError(
            response,
            "Não foi possível cadastrar a fantasia de grupo.",
          ),
        );
      setGroupName("");
      setGroupTitle("");
      setMessage(
        "Fantasia de grupo cadastrada. Adicione a foto para concluir a inscrição.",
      );
      await load();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Não foi possível cadastrar a fantasia de grupo.",
      );
    } finally {
      setPendingId("");
    }
  }

  async function createIndividualEntry(
    formEvent: React.FormEvent<HTMLFormElement>,
  ) {
    formEvent.preventDefault();
    if (
      !detail ||
      !individualPhoto ||
      !individualConsent ||
      pendingId ||
      !canMutateMembership
    )
      return;
    setPendingId("create-individual");
    setError("");
    setMessage("");
    try {
      const form = new FormData();
      form.set("image", individualPhoto);
      form.set("photoConsent", "true");
      form.set("costumeTitle", individualTitle);
      const response = await fetch(
        `/api/admin/events/${event._id}/guests/${guestId}/contestants/individual`,
        { method: "POST", body: form },
      );
      if (!response.ok)
        throw new Error(
          await responseError(
            response,
            "Não foi possível cadastrar a fantasia individual.",
          ),
        );
      setIndividualTitle("");
      setIndividualPhoto(null);
      setIndividualConsent(false);
      setMessage("Fantasia individual cadastrada.");
      await load();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Não foi possível cadastrar a fantasia individual.",
      );
    } finally {
      setPendingId("");
    }
  }

  async function uploadPhoto(entry: CandidateDetail) {
    const file = newPhoto[entry._id];
    if (!file || pendingId || (!entry.photoUrl && !photoConsent[entry._id]))
      return;
    setPendingId(entry._id);
    setError("");
    setMessage("");
    try {
      const form = new FormData();
      form.set("image", file);
      if (!entry.photoUrl) form.set("photoConsent", "true");
      const response = await fetch(
        `/api/admin/events/${event._id}/contestants/${entry._id}/photo`,
        { method: "PUT", body: form },
      );
      if (!response.ok)
        throw new Error(
          await responseError(response, "Não foi possível salvar a foto."),
        );
      setNewPhoto((previous) => ({ ...previous, [entry._id]: null }));
      setPhotoConsent((previous) => ({ ...previous, [entry._id]: false }));
      setMessage("Foto da fantasia salva.");
      await load();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Não foi possível salvar a foto.",
      );
    } finally {
      setPendingId("");
    }
  }

  async function removePhoto(entry: CandidateDetail) {
    if (!entry.photoUrl || pendingId) return;
    if (!window.confirm(`Remover a foto de ${entry.displayName}?`)) return;
    setPendingId(entry._id);
    setError("");
    setMessage("");
    try {
      const response = await fetch(
        `/api/admin/events/${event._id}/contestants/${entry._id}/photo`,
        { method: "DELETE" },
      );
      if (!response.ok)
        throw new Error(
          await responseError(response, "Não foi possível remover a foto."),
        );
      setMessage(
        "Foto removida. A fantasia permanece cadastrada como rascunho.",
      );
      await load();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Não foi possível remover a foto.",
      );
    } finally {
      setPendingId("");
    }
  }

  async function removeCandidate(entry: CandidateDetail) {
    if (
      pendingId ||
      !window.confirm(
        `Excluir a fantasia ${entry.displayName}? A ação não pode ser desfeita.`,
      )
    )
      return;
    setPendingId(entry._id);
    setError("");
    setMessage("");
    try {
      const response = await fetch(
        `/api/admin/events/${event._id}/contestants/${entry._id}`,
        { method: "DELETE" },
      );
      if (!response.ok)
        throw new Error(
          await responseError(response, "Não foi possível excluir a fantasia."),
        );
      setDetail((previous) =>
        previous
          ? {
              ...previous,
              entries: previous.entries.filter(
                (item) => item._id !== entry._id,
              ),
            }
          : previous,
      );
      setMessage("Fantasia excluída.");
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Não foi possível excluir a fantasia.",
      );
    } finally {
      setPendingId("");
    }
  }

  async function removeGuest() {
    if (
      !detail ||
      pendingId ||
      !window.confirm(
        `Excluir ${detail.guest.fullName} e suas inscrições? A ação não pode ser desfeita.`,
      )
    )
      return;
    setPendingId("guest");
    setError("");
    try {
      const response = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: event._id, _id: guestId }),
      });
      if (!response.ok)
        throw new Error(
          await responseError(
            response,
            "Não foi possível excluir o convidado.",
          ),
        );
      router.push(`/dashboard/convidados?year=${event.year}`);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Não foi possível excluir o convidado.",
      );
    } finally {
      setPendingId("");
    }
  }

  async function resetAccess() {
    const guest = detail?.guest;
    if (!guest?.clerkUserId || pendingId) return;
    if (
      !window.confirm(
        `Redefinir o acesso de ${guest.fullName} (${guest.email})? O convidado precisará verificar este email novamente.`,
      )
    )
      return;
    setPendingId("access");
    setError("");
    try {
      const response = await fetch("/api/admin/users/access-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: event._id,
          userId: guest._id,
          expectedClerkUserId: guest.clerkUserId,
        }),
      });
      if (!response.ok)
        throw new Error(
          await responseError(response, "Não foi possível redefinir o acesso."),
        );
      setMessage("Vínculo de acesso redefinido.");
      await load();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Não foi possível redefinir o acesso.",
      );
    } finally {
      setPendingId("");
    }
  }

  const changed = isNew || fullName !== savedName || email !== savedEmail;
  const canMutateMembership = membership.canChangeContestantMembership;
  const canAddEntries =
    canMutateMembership && detail?.guest.status !== "cancelled";
  const hasIndividualEntry = detail?.entries.some(
    (entry) => entry.entryType === "individual",
  );
  const hasGroupEntry = detail?.entries.some(
    (entry) => entry.entryType === "group",
  );

  return (
    <section className="space-y-5">
      <header className="rounded-2xl border border-white/10 bg-stone-950/80 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="min-w-0 flex-1 truncate text-4xl text-orange-300 sm:text-5xl">
            {isNew
              ? "Adicionar convidado"
              : loading
                ? "Convidado"
                : (detail?.guest.fullName ?? "Convidado")}
          </h1>
          <Link
            href={`/dashboard/convidados?year=${event.year}`}
            className="shrink-0 text-sm whitespace-nowrap text-orange-200 underline underline-offset-4"
          >
            ← Voltar
          </Link>
        </div>
      </header>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-400/30 bg-red-950/40 p-3 text-red-200"
        >
          {error}
        </p>
      )}
      {message && (
        <p
          role="status"
          className="rounded-lg border border-green-400/30 bg-green-950/30 p-3 text-green-200"
        >
          {message}
        </p>
      )}
      {loading && (
        <p role="status" className="text-stone-300">
          Carregando convidado…
        </p>
      )}

      {!loading && (isNew || detail) && (
        <>
          <section className="space-y-4 rounded-xl bg-white/10 p-4 md:p-6">
            <h2 className="text-2xl font-semibold">Dados do convidado</h2>
            <form onSubmit={saveGuest} className="grid gap-4 md:max-w-2xl">
              <label className="grid gap-2">
                <span>Nome e sobrenome</span>
                <input
                  required
                  minLength={2}
                  maxLength={120}
                  value={fullName}
                  disabled={Boolean(pendingId)}
                  onChange={(event) => setFullName(event.target.value)}
                  className="rounded-lg border border-white/20 bg-black/40 px-3 py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300"
                />
              </label>
              <label className="grid gap-2">
                <span>Email</span>
                <input
                  required
                  type="email"
                  value={email}
                  disabled={Boolean(pendingId)}
                  onChange={(event) => setEmail(event.target.value)}
                  className="rounded-lg border border-white/20 bg-black/40 px-3 py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300"
                />
              </label>
              {isNew && (
                <p className="text-sm text-stone-300">
                  O convidado poderá cadastrar uma fantasia e foto no Meu
                  Halloween após a confirmação da presença.
                </p>
              )}
              <div>
                <button
                  type="submit"
                  disabled={
                    !changed ||
                    Boolean(pendingId) ||
                    (isNew && !canMutateMembership)
                  }
                  className="rounded-lg bg-orange-400 px-4 py-3 font-semibold text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-200 disabled:opacity-50"
                >
                  {pendingId === "guest"
                    ? "Salvando…"
                    : isNew
                      ? "Adicionar convidado"
                      : "Salvar alterações"}
                </button>
              </div>
            </form>
            {detail?.guest.clerkUserId && (
              <div className="border-t border-white/15 pt-4">
                <p className="mb-3 text-sm text-stone-300">
                  Conta vinculada: redefina o acesso somente quando o vínculo
                  atual precisar ser removido.
                </p>
                <button
                  type="button"
                  disabled={Boolean(pendingId)}
                  onClick={() => void resetAccess()}
                  className="rounded-lg border border-orange-300/50 px-4 py-2 text-orange-100 disabled:opacity-50"
                >
                  {pendingId === "access"
                    ? "Redefinindo…"
                    : "Redefinir vínculo de acesso"}
                </button>
              </div>
            )}
          </section>

          {!isNew && detail && (
            <section className="space-y-4 rounded-xl bg-white/10 p-4 md:p-6">
              <div>
                <h2 className="text-2xl font-semibold">Fantasias</h2>
                <p className="mt-1 text-sm text-stone-300">
                  Cadastre ou corrija as fantasias deste convidado. A primeira
                  abertura da votação encerra inclusões e exclusões.
                </p>
              </div>
              {detail.guest.status === "cancelled" ? (
                <p
                  role="status"
                  className="rounded-lg border border-amber-300/20 bg-amber-300/5 p-3 text-sm text-amber-100"
                >
                  Este RSVP foi cancelado; não é possível cadastrar fantasias.
                </p>
              ) : null}
              <div className="grid gap-4 lg:grid-cols-2">
                {!hasIndividualEntry ? (
                  <details
                    name="guest-fantasies"
                    className="group rounded-lg border border-white/10 bg-black/20"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg p-4 text-lg font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300">
                      <span>Nova fantasia individual</span>
                      <span
                        aria-hidden="true"
                        className="text-orange-200 transition-transform group-open:rotate-180"
                      >
                        ⌄
                      </span>
                    </summary>
                    <form
                      onSubmit={createIndividualEntry}
                      className="grid content-start gap-3 border-t border-white/10 p-4"
                    >
                      <label className="grid gap-1 text-sm">
                        Título da fantasia (opcional)
                        <input
                          maxLength={100}
                          value={individualTitle}
                          disabled={!canAddEntries || Boolean(pendingId)}
                          onChange={(input) =>
                            setIndividualTitle(input.target.value)
                          }
                          className="rounded border border-white/20 bg-black px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300 disabled:opacity-50"
                        />
                      </label>
                      <label className="grid gap-1 text-sm">
                        Foto da fantasia
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          required
                          disabled={!canAddEntries || Boolean(pendingId)}
                          onChange={(input) =>
                            setIndividualPhoto(input.target.files?.[0] ?? null)
                          }
                          className="block w-full text-sm text-stone-200 file:mr-3 file:rounded-lg file:border-0 file:bg-orange-400 file:px-3 file:py-2 file:font-semibold file:text-black disabled:opacity-50"
                        />
                      </label>
                      <p className="text-xs text-stone-400">
                        JPG, PNG ou WebP, até 8 MB.
                      </p>
                      <label className="flex items-start gap-2 text-sm text-stone-300">
                        <input
                          type="checkbox"
                          checked={individualConsent}
                          disabled={!canAddEntries || Boolean(pendingId)}
                          onChange={(input) =>
                            setIndividualConsent(input.target.checked)
                          }
                          className="mt-1 accent-orange-400"
                        />
                        Confirmo que o convidado autorizou o uso desta foto no
                        concurso.
                      </label>
                      <button
                        type="submit"
                        disabled={
                          !canAddEntries ||
                          !individualPhoto ||
                          !individualConsent ||
                          Boolean(pendingId)
                        }
                        className="w-fit rounded-lg bg-orange-400 px-3 py-2 text-sm font-semibold text-black disabled:opacity-50"
                      >
                        {pendingId === "create-individual"
                          ? "Cadastrando…"
                          : "Cadastrar fantasia individual"}
                      </button>
                    </form>
                  </details>
                ) : null}
                {!hasGroupEntry ? (
                  <details
                    name="guest-fantasies"
                    className="group rounded-lg border border-white/10 bg-black/20"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg p-4 text-lg font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300">
                      <span>Nova fantasia de grupo ou dupla</span>
                      <span
                        aria-hidden="true"
                        className="text-orange-200 transition-transform group-open:rotate-180"
                      >
                        ⌄
                      </span>
                    </summary>
                    <form
                      onSubmit={createGroupEntry}
                      className="grid content-start gap-3 border-t border-white/10 p-4"
                    >
                      <label className="grid gap-1 text-sm">
                        Nome da fantasia
                        <input
                          required
                          minLength={2}
                          maxLength={120}
                          value={groupName}
                          disabled={!canAddEntries || Boolean(pendingId)}
                          onChange={(input) => setGroupName(input.target.value)}
                          className="rounded border border-white/20 bg-black px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300 disabled:opacity-50"
                        />
                      </label>
                      <label className="grid gap-1 text-sm">
                        Título da fantasia (opcional)
                        <input
                          maxLength={100}
                          value={groupTitle}
                          disabled={!canAddEntries || Boolean(pendingId)}
                          onChange={(input) =>
                            setGroupTitle(input.target.value)
                          }
                          className="rounded border border-white/20 bg-black px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300 disabled:opacity-50"
                        />
                      </label>
                      <p className="text-xs text-stone-400">
                        A foto pode ser adicionada depois. Confirme a
                        autorização do convidado antes do envio.
                      </p>
                      <button
                        type="submit"
                        disabled={
                          !canAddEntries ||
                          !groupName.trim() ||
                          Boolean(pendingId)
                        }
                        className="w-fit rounded-lg bg-orange-400 px-3 py-2 text-sm font-semibold text-black disabled:opacity-50"
                      >
                        {pendingId === "create-group"
                          ? "Cadastrando…"
                          : "Cadastrar fantasia de grupo"}
                      </button>
                    </form>
                  </details>
                ) : null}
              </div>
              {!canAddEntries &&
              detail.guest.status !== "cancelled" &&
              membership.contestantMembershipDisabledReason ? (
                <p role="status" className="text-sm text-stone-300">
                  {membership.contestantMembershipDisabledReason}
                </p>
              ) : null}
              {detail.entries.length ? (
                detail.entries.map((entry) => (
                  <details
                    key={entry._id}
                    name="guest-fantasies"
                    className="group rounded-xl border border-white/10 bg-black/20"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl p-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">
                          {entry.categoryIcon} {entry.displayName}
                        </p>
                        <p className="truncate text-sm text-stone-300">
                          {entry.entryType === "group"
                            ? "Grupo ou dupla"
                            : "Individual"}{" "}
                          · {entry.categoryTitle}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="hidden text-sm text-stone-300 sm:inline">
                          {entry.status === "locked"
                            ? "congelada"
                            : entry.status === "ready"
                              ? "pronta"
                              : entry.status === "withdrawn"
                                ? "retirada"
                                : "rascunho"}
                        </span>
                        <span
                          aria-hidden="true"
                          className="text-orange-200 transition-transform group-open:rotate-180"
                        >
                          ⌄
                        </span>
                      </div>
                    </summary>
                    <div className="grid gap-4 border-t border-white/10 p-4 md:grid-cols-[minmax(0,1fr)_minmax(16rem,0.9fr)]">
                      <div className="space-y-2">
                        {entry.costumeTitle && (
                          <p className="text-sm text-stone-300">
                            Fantasia: {entry.costumeTitle}
                          </p>
                        )}
                        {entry.photoUrl ? (
                          <Image
                            src={entry.photoUrl}
                            alt={`Foto de ${entry.displayName}`}
                            width={960}
                            height={720}
                            unoptimized
                            className="max-h-80 w-full rounded-lg object-contain"
                          />
                        ) : (
                          <p className="rounded-lg border border-dashed border-white/20 p-5 text-sm text-stone-300">
                            Esta fantasia não tem foto.
                          </p>
                        )}
                      </div>
                      <div className="space-y-3">
                        <label className="grid gap-2 text-sm">
                          {entry.photoUrl
                            ? "Substituir foto"
                            : "Adicionar foto"}
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            disabled={
                              Boolean(pendingId) ||
                              (!canMutateMembership && !entry.photoUrl)
                            }
                            onChange={(event) =>
                              setNewPhoto((previous) => ({
                                ...previous,
                                [entry._id]: event.target.files?.[0] ?? null,
                              }))
                            }
                            className="block w-full text-sm text-stone-200 file:mr-3 file:rounded-lg file:border-0 file:bg-orange-400 file:px-3 file:py-2 file:font-semibold file:text-black"
                          />
                        </label>
                        {!entry.photoUrl && (
                          <label className="flex items-start gap-2 text-sm text-stone-300">
                            <input
                              type="checkbox"
                              checked={Boolean(photoConsent[entry._id])}
                              disabled={Boolean(pendingId)}
                              onChange={(event) =>
                                setPhotoConsent((previous) => ({
                                  ...previous,
                                  [entry._id]: event.target.checked,
                                }))
                              }
                              className="mt-1 accent-orange-400"
                            />
                            Confirmo que o convidado autorizou o uso desta foto
                            no concurso.
                          </label>
                        )}
                        <p className="text-xs text-stone-400">
                          JPG, PNG ou WebP, até 8 MB.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={
                              !newPhoto[entry._id] ||
                              Boolean(pendingId) ||
                              (!entry.photoUrl && !photoConsent[entry._id]) ||
                              (!canMutateMembership && !entry.photoUrl)
                            }
                            onClick={() => void uploadPhoto(entry)}
                            className="rounded-lg bg-orange-400 px-3 py-2 text-sm font-semibold text-black disabled:opacity-50"
                          >
                            {pendingId === entry._id
                              ? "Enviando…"
                              : "Salvar foto"}
                          </button>
                          {entry.photoUrl && (
                            <button
                              type="button"
                              disabled={
                                Boolean(pendingId) || !canMutateMembership
                              }
                              onClick={() => void removePhoto(entry)}
                              className="rounded-lg border border-white/25 px-3 py-2 text-sm disabled:opacity-50"
                            >
                              Remover foto
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={
                              Boolean(pendingId) || !canMutateMembership
                            }
                            onClick={() => void removeCandidate(entry)}
                            className="rounded-lg border border-red-300/40 px-3 py-2 text-sm text-red-200 disabled:opacity-50"
                          >
                            Excluir fantasia
                          </button>
                        </div>
                      </div>
                    </div>
                  </details>
                ))
              ) : (
                <p className="rounded-lg border border-dashed border-white/20 p-5 text-sm text-stone-300">
                  Este convidado ainda não tem fantasia cadastrada.
                </p>
              )}
            </section>
          )}

          {!isNew && detail && (
            <section className="rounded-xl border border-red-300/20 bg-red-950/20 p-4 md:p-6">
              <h2 className="text-xl font-semibold text-red-100">
                Excluir convidado
              </h2>
              <p className="mt-2 mb-4 text-sm text-stone-300">
                A exclusão remove o RSVP e as fantasias deste convidado. Não
                será permitida após o encerramento das inscrições nem se já
                houver votos.
              </p>
              <button
                type="button"
                disabled={!canMutateMembership || Boolean(pendingId)}
                onClick={() => void removeGuest()}
                className="rounded-lg border border-red-300/50 px-4 py-2 font-semibold text-red-100 disabled:opacity-50"
              >
                {pendingId === "guest"
                  ? "Excluindo…"
                  : "Excluir convidado e fantasias"}
              </button>
            </section>
          )}
        </>
      )}
    </section>
  );
}
