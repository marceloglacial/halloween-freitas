import BackButton from "@/components/back-button";
import { fetchData } from "@/util/fetch-data";

interface ResultPageParams {
  id: string;
}

interface ResultPageProps {
  params: ResultPageParams;
}

type UserWithVotes = {
  votes: number;
} & User;

type Results = {
  users: UserWithVotes[];
  totalVotes: number;
};

export default async function ResultPage({ params }: ResultPageProps) {
  const { id } = await params;
  const results: Results = await fetchData(`results/${id}`);
  const category: Category = await fetchData(`categories/${id}`);

  const hasResults = results.users?.length;

  return (
    <section className="min-h-screen w-screen justify-center px-8 py-16 text-center">
      <BackButton href={"/resultados"} />
      <h1 className="mt-8 mb-8 text-4xl lg:text-6xl">
        {category.icon} {category.title}
      </h1>
      <ul>
        {!hasResults && <li>Nenhum voto nessa categoria</li>}
        {hasResults &&
          results.users.map((user) => (
            <li key={user._id}>
              {results.totalVotes > 0
                ? ((user.votes / results.totalVotes) * 100).toFixed(2)
                : "0.00"}
              % - {user.fullName} - {user.votes} voto(s)
            </li>
          ))}
      </ul>
    </section>
  );
}
