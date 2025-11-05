import Link from "next/link";
import Card from "../card";

export const PastEvent = () => {
  return (
    <section className="relative grid justify-center bg-black px-8 py-12 lg:p-8">
      <div className="relative grid max-w-7xl gap-8 lg:-top-28 lg:grid-cols-2">
        <Link href={"/resultados"}>
          <Card title={"Resultados"} icon={"🏆"} />
        </Link>
        <Link href={"/fotos"}>
          <Card title={"Galeria de Photos"} icon={"📸"} />
        </Link>
      </div>
    </section>
  );
};
