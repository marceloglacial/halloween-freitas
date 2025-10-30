import BackButton from "@/components/back-button";
import { ResultList } from "@/components/results/result-list";
import { ResultsUser } from "@/components/results/results-user";
import { fetchData } from "@/util/fetch-data";
import React from "react";

export default async function ResultPage({ params }: ResultPageProps) {
  const { id } = await params;
  const results: Results = await fetchData(`results/${id}`);
  const category: Category = await fetchData(`categories/${id}`);

  if (!results?.users)
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center gap-8">
        <BackButton href={"/resultados"} />
        <h1 className="text-4xl lg:text-6xl">
          {category.icon} {category.title}
        </h1>

        <p className="text-2xl text-orange-400">Nenhum voto nessa categoria.</p>
      </div>
    );

  const firstPlace = results?.users[0];
  const winners = results?.users.splice(1);

  return (
    <section className="min-h-screen w-screen justify-center px-8 py-16 text-center">
      <BackButton href={"/resultados"} />
      <h1 className="mt-8 mb-8 text-4xl lg:text-6xl">
        {category.icon} {category.title}
      </h1>
      <div className="mx-auto mt-32 grid max-w-lg gap-16">
        <ResultsUser
          position={1}
          showImage={true}
          user={firstPlace}
          totalVotes={results?.totalVotes}
        />

        <ResultList users={winners} totalVotes={results.totalVotes} />
      </div>
    </section>
  );
}
