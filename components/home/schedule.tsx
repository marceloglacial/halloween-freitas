import { secondaryFont } from "@/util/fonts";

const Schedule = () => {
  return (
    <section className="relative grid justify-center bg-black p-8">
      <div className="relative grid max-w-7xl">
        <div className="relative grid gap-16 lg:-top-24">
          <div className="text-center">
            <span className="text-9xl">🦇</span>
            <h2 className={`${secondaryFont.className} text-8xl`}>
              Programação
            </h2>
          </div>
          <div className="grid gap-8 text-2xl lg:grid-cols-2 lg:gap-16">
            <div className="grid gap-4">
              <p>Temos um trato mágico para você:</p>
              <p>
                Um{" "}
                <span className="text-orange-400">concurso de fantasias</span>{" "}
                que vai fazer o chão tremer!
              </p>
              <p>
                <span className="text-orange-400">Prêmios inacreditáveis</span>{" "}
                aguardam os vencedores, então solte a sua imaginação e
                prepare-se para assombrar!
              </p>
              <p>
                Seja você um espirito assombroso, uma bruxa maravilhosa ou um
                ser de outro mundo, sua criatividade é sua melhor arma!
              </p>
            </div>
            <div className="flex flex-col gap-4">
              <h3 className={`${secondaryFont.className} text-3xl`}>
                Premiação para as Categorias
              </h3>
              <ul className="grid gap-3">
                <li>🏆 Melhor Fantasia</li>
                <li>💩 Pior Fantasia</li>
                <li>🧟 Fantasia Mais Assustadora</li>
                <li>🤡 Fantasia Mais Engraçada</li>
                <li>👯‍♀️ Melhor Fantasia de Grupo ou Dupla</li>
                <li>👻 Melhor Fantasia Infantil</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
export default Schedule;
