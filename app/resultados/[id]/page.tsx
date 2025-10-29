import BackButton from "@/components/back-button";
import { ResultsUser } from "@/components/results/results-user";
import { fetchData } from "@/util/fetch-data";

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
          results.users.map((user, index) => (
            <li key={user._id} className="pb-8">
              <ResultsUser
                showImage={index === 0}
                user={user}
                totalVotes={results?.totalVotes}
              />
            </li>
          ))}
      </ul>
    </section>
  );
}
