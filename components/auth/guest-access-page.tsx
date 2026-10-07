import { SignIn, SignUp } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getEventById, getRegistrationState } from "@/lib/events";
import FeatureUnavailable from "@/components/feature-unavailable";
import GuestAccessCompletion from "@/components/auth/guest-access-completion";
import {
  guestAccessUrl,
  guestReturnPath,
  validGuestEventId,
} from "@/util/guest-access";

type AccessQuery = { eventId?: string; returnTo?: string };

export default async function GuestAccessPage({
  searchParams,
  mode = "sign-in",
}: {
  searchParams: Promise<AccessQuery>;
  mode?: "sign-in" | "sign-up" | "complete";
}) {
  if (
    !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
    !process.env.CLERK_SECRET_KEY
  )
    return (
      <FeatureUnavailable
        title="Acesso indisponível"
        message="Não foi possível disponibilizar o acesso agora. Tente novamente mais tarde."
      />
    );
  const query = await searchParams;
  if (!validGuestEventId(query.eventId))
    return (
      <FeatureUnavailable
        title="Escolha um evento"
        message="Volte ao início e escolha a ação desejada para entrar."
      />
    );
  const event = await getEventById(query.eventId);
  if (!event) notFound();
  const returnTo = guestReturnPath(query.returnTo, event._id);
  const context = new URLSearchParams({
    eventId: event._id,
    returnTo,
  }).toString();
  const completionUrl = `/acesso/concluir?${context}`;
  const { userId } = await auth();
  if (mode !== "complete" && userId) redirect(completionUrl);
  if (mode === "complete" && !userId)
    redirect(guestAccessUrl(event._id, returnTo));
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-6 px-4 py-12 text-center">
      <h1 className="text-4xl">Acesso de convidados</h1>
      <p>
        {event.title} · {event.year}
      </p>
      {mode === "complete" ? (
        <GuestAccessCompletion
          eventId={event._id}
          returnTo={returnTo}
          registrationOpen={getRegistrationState(event) === "open"}
        />
      ) : (
        <>
          <p>
            Use o email da sua confirmação. Continue com Google ou receba um
            código por email, sem criar uma senha.
          </p>
          <p className="text-sm text-orange-300">
            Se o Google não abrir no navegador do aplicativo, use o código por
            email ou abra este link no seu navegador.
          </p>
          {mode === "sign-up" ? (
            <SignUp
              path="/acesso/cadastro"
              routing="path"
              signInUrl={guestAccessUrl(event._id, returnTo)}
              forceRedirectUrl={completionUrl}
              signInForceRedirectUrl={completionUrl}
              fallback={<p role="status">Carregando acesso...</p>}
            />
          ) : (
            <SignIn
              path="/acesso"
              routing="path"
              withSignUp
              signUpUrl={`/acesso/cadastro?${context}`}
              forceRedirectUrl={completionUrl}
              signUpForceRedirectUrl={completionUrl}
              fallback={<p role="status">Carregando acesso...</p>}
            />
          )}
        </>
      )}
      <Link
        href="/"
        className="rounded-lg px-4 py-2 text-orange-300 underline focus-visible:outline-2"
      >
        Voltar ao início
      </Link>
    </main>
  );
}
