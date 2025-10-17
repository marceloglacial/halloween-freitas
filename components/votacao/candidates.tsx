import { FC, JSX } from "react";

interface CandidatesProps {
  user: User;
}
const Candidates: FC<CandidatesProps> = (props): JSX.Element => {
  return (
    <section className="flex h-screen w-screen flex-col items-center justify-center">
      <h1 className="text-5xl">Bem-vindo, {props.user.fullName}!</h1>
      <p className="text-2xl text-orange-400">
        ATENÇÃO: Você pode votar na mesma pessoa em mais de uma categoria.
      </p>
    </section>
  );
};

export default Candidates;
