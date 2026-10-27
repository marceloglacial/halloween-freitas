import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-cloudinary", () => ({
  CldImage: ({
    src,
    alt,
    className,
  }: {
    src: string;
    alt: string;
    className?: string;
  }) => <span data-src={src} data-alt={alt} className={className} />,
}));
vi.mock("@/util/fonts", () => ({
  secondaryFont: { className: "theme-font" },
}));

import { ResultList } from "@/components/results/result-list";

const users: UserWithVotes[] = [
  {
    _id: "winner-a",
    eventId: "event-2026",
    fullName: "Ana Freitas",
    imageUrl: "ana-photo",
    votes: 4,
  },
  {
    _id: "winner-b",
    eventId: "event-2026",
    fullName: "Beatriz Freitas",
    imageUrl: null,
    votes: 4,
  },
  {
    _id: "third-place",
    eventId: "event-2026",
    fullName: "Caio Freitas",
    imageUrl: "caio-photo",
    votes: 2,
  },
];

describe("public results ranking", () => {
  const props = {
    eventTitle: "Halloween 2026",
    categoryTitle: "Melhor Fantasia",
  };

  it("shows the podium, tied places, photos, counts, percentages, and remaining ranking", () => {
    const html = renderToStaticMarkup(
      <ResultList {...props} users={users} totalVotes={10} />,
    );

    expect(html).toContain('aria-label="Classificação final"');
    expect(html).toContain('aria-label="1º lugar: Ana Freitas"');
    expect(html).toContain('aria-label="1º lugar: Beatriz Freitas"');
    expect(html).toContain('aria-label="3º lugar: Caio Freitas"');
    expect(html).toContain('aria-label="2º lugar sem participante"');
    expect(html).toContain("Demais participantes");
    expect(html).toContain("Halloween 2026");
    expect(html).toContain('aria-label="Ampliar foto de Ana Freitas"');
    expect(html).toContain("ana-photo");
    expect(html).toContain("Foto indisponível");
    expect(html).toContain("4 votos");
    expect(html).toContain("2 votos");
    expect(html).toContain("40.00%");
    expect(html).toContain("20.00%");
  });

  it("shares lower places for equal vote counts", () => {
    const html = renderToStaticMarkup(
      <ResultList
        {...props}
        users={[
          { ...users[0], votes: 5 },
          { ...users[1], votes: 3 },
          { ...users[2], votes: 3 },
          { ...users[0], _id: "fourth-place", votes: 1 },
        ]}
        totalVotes={12}
      />,
    );

    expect(html).toContain('aria-label="1º lugar: Ana Freitas"');
    expect(html).toContain('aria-label="2º lugar: Beatriz Freitas"');
    expect(html).toContain('aria-label="2º lugar: Caio Freitas"');
    expect(html).toContain('aria-label="3º lugar sem participante"');
    expect(html).toContain('aria-label="4º lugar: Ana Freitas"');
  });

  it("keeps long names and zero-total percentages safe for narrow screens", () => {
    const html = renderToStaticMarkup(
      <ResultList
        {...props}
        users={[
          {
            ...users[0],
            fullName: "Ana Beatriz de Oliveira Freitas da Silva",
            votes: 0,
          },
        ]}
        totalVotes={0}
      />,
    );

    expect(html).toContain("break-words");
    expect(html).toContain("Ana Beatriz de Oliveira Freitas da Silva");
    expect(html).toContain("0.00%");
    expect(html).not.toContain("NaN");
  });

  it("keeps three visual podium places with fewer than three candidates", () => {
    const html = renderToStaticMarkup(
      <ResultList {...props} users={[users[0]]} totalVotes={4} />,
    );

    expect(html).toContain('aria-label="1º lugar: Ana Freitas"');
    expect(html).toContain('aria-label="2º lugar sem participante"');
    expect(html).toContain('aria-label="3º lugar sem participante"');
    expect(html).not.toContain("Demais participantes");
  });
});
