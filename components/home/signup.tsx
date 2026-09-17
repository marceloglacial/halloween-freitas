import { FC, JSX } from "react";
import { secondaryFont } from "@/util/fonts";
import Form from "@/components/form";

function formatEventDate(value: string, timezone: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: timezone,
  }).format(new Date(value));
}

const SignUp: FC<{
  event: HalloweenEvent;
  registrationState: RegistrationState;
}> = ({ event, registrationState }): JSX.Element => {
  const registrationMessage =
    registrationState === "upcoming"
      ? `As inscrições abrem em ${formatEventDate(event.registrationOpensAt, event.timezone)}.`
      : `As inscrições foram encerradas em ${formatEventDate(event.registrationClosesAt, event.timezone)}.`;

  return (
    <section className="relative grid justify-center bg-zinc-800 px-6 pt-16 pb-24 lg:p-6">
      <div className="relative grid max-w-4xl text-center">
        <div className="relative grid gap-12 lg:-top-24">
          <div className="grid gap-4">
            <span className="text-9xl">💀</span>
            <h2 className={`${secondaryFont.className} text-6xl lg:text-8xl`}>
              É Só Chegar!
            </h2>
          </div>
          {registrationState === "open" ? (
            <div className="grid gap-8">
              <div className="lg:text-2xl">
                Nada de medo, venha se juntar a nós para uma noite assustadora e
                lembranças arrepiantes. <br />
                Preencha os dados abaixo e confirme sua presença!
              </div>
              <div className="text-xl text-orange-400 lg:text-2xl">
                <span className="font-bold underline">IMPORTANTE!</span>
                <br />
                Cada adulto deve confirmar sua presença com seu próprio e-mail.{" "}
                <br />
                Uma confirmação por pessoa!
              </div>
              <Form />
            </div>
          ) : (
            <div
              role="status"
              className="rounded-2xl border border-orange-500/50 bg-black/30 p-8 text-xl text-orange-300 lg:text-2xl"
            >
              {registrationMessage}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
export default SignUp;
