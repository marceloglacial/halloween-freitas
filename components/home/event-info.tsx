import Card from "@/components/card";
import { EVENT_DATE } from "@/constants/globals";
import { formatDate, formatTime } from "@/util/locale";

const cards: CardProps[] = [
  {
    title: "Onde?",
    icon: "👻",
    description: (
      <>
        Estamos convocando todos os fantasmas, bruxas, vampiros e monstros para
        uma festa na
        <span className="text-green-700">
          {" "}
          Mansão Assombrada dos Freitas
        </span>{" "}
        que fará até os mortos-vivos se agitarem!
      </>
    ),
  },
  {
    title: "Quando?",
    icon: "🧛🏻‍♂️",
    description: (
      <>
        <span className="text-green-700">
          {formatDate(EVENT_DATE)} <br />A partir das {formatTime(EVENT_DATE)}.
        </span>
        <br />A festa só acaba quando os vampiros voltarem para os caixões, ou
        seja, até o sol raiar!
      </>
    ),
  },
  {
    title: "O que levar?",
    icon: "🧪",
    description: (
      <>
        Prepare sua poção secreta e prato favorito para uma noite de sustos e
        delícias! Cada um deve trazer{" "}
        <span className="text-green-700">sua bebida encantada</span> e um{" "}
        <span className="text-green-700">prato sinistro para compartilhar</span>{" "}
        com todos.
      </>
    ),
  },
];

const EventInfo = () => {
  return (
    <section className="relative grid justify-center bg-black/70 p-8">
      <div className="relative grid max-w-7xl gap-8 lg:-top-28 lg:grid-cols-3">
        {cards.map((card, index) => (
          <Card
            title={card.title}
            icon={card.icon}
            description={card.description}
            key={index}
          />
        ))}
      </div>
    </section>
  );
};
export default EventInfo;
