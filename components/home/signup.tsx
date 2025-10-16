import { FC, JSX } from "react";
import { secondaryFont } from "@/util/fonts";
import Form from "@/components/form";

const SignUp: FC = (): JSX.Element => {
  return (
    <section className="relative grid justify-center bg-black/70 px-6 py-24 lg:p-6">
      <div className="relative grid max-w-4xl text-center">
        <div className="relative grid gap-16 lg:-top-24">
          <div>
            <span className="text-9xl">💀</span>
            <h2 className={`${secondaryFont.className} text-6xl lg:text-8xl`}>
              É Só Chegar!
            </h2>
          </div>
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
      </div>
    </section>
  );
};
export default SignUp;
