import { FC, JSX } from "react";
import CategoryList from "./category-list";

interface CandidatesProps {
  user: User;
}

const Candidates: FC<CandidatesProps> = ({ user }): JSX.Element => {
  return (
    <section className="flex h-screen w-screen flex-col items-center justify-center gap-8 p-8 text-center">
      <h1 className="text-5xl">Bem-vindo, {user.fullName}!</h1>
      <p className="mt-2 text-2xl text-orange-400">
        ATENÇÃO: Você pode votar na mesma pessoa em mais de uma categoria.
      </p>
      <CategoryList />
    </section>
  );
};

export default Candidates;
