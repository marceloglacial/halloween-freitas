import { FC, JSX } from "react";
import CategoryList from "./category-list";

interface CandidatesProps {
  user: User;
}

const Candidates: FC<CandidatesProps> = ({ user }): JSX.Element => {
  return (
    <section className="mmin-h-screen flex w-screen flex-col items-center justify-center gap-8 p-8 text-center">
      <h1 className="text-5xl">
        Bem-vindo, <br />
        {user.fullName}!
      </h1>
      <p className="mt-2 text-xl text-orange-400 lg:text-2xl">
        ATENÇÃO: Você pode votar na mesma pessoa em mais de uma categoria.
      </p>
      <CategoryList />
    </section>
  );
};

export default Candidates;
