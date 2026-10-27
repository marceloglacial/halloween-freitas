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

import {
  getPodiumEntryRevealState,
  getPodiumRevealSequence,
  getRevealedResultIds,
  getVisiblePodiumEntries,
  ResultList,
} from "@/components/results/result-list";

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

  it("reserves contestant details without exposing names or votes", () => {
    const html = renderToStaticMarkup(
      <ResultList {...props} users={users} totalVotes={10} />,
    );

    expect(html).toContain('aria-label="Classificação final"');
    expect(html).toContain("1º lugar reservado");
    expect(html).toContain("3º lugar reservado");
    expect(html).toContain('aria-label="2º lugar sem participante"');
    expect(html).not.toContain("Atalhos de teclado da revelação");
    expect(html).not.toContain("para ocultar e");
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("blur-md");
    expect(html).toContain("bg-zinc-950/60");
    expect(html).toContain('<article aria-label="1º lugar reservado"');
    expect(html).not.toContain("Ana Freitas");
    expect(html).toMatch(
      /<h2 aria-hidden="true" class="[^"]*blur-sm[^"]*">Pessoa misteriosa<\/h2>/,
    );
    expect(html).toMatch(
      /<p aria-hidden="true" class="[^"]*blur-sm[^"]*">00 votos · 00\.00%<\/p>/,
    );
    expect(html).not.toContain("Demais participantes");
    expect(html).toContain("Halloween 2026");
    expect(html.indexOf("Halloween 2026")).toBeLessThan(
      html.indexOf("Melhor Fantasia"),
    );
    expect(html).not.toContain("🎭");
  });

  it("reveals third, second, and first place, showing podium ties individually", () => {
    const rankedUsers = [
      { user: { ...users[0], votes: 10 }, position: 1 },
      { user: { ...users[1], votes: 8 }, position: 2 },
      { user: { ...users[2], votes: 6 }, position: 3 },
      {
        user: { ...users[0], _id: "fourth-place-tie", votes: 6 },
        position: 3,
      },
      {
        user: { ...users[1], _id: "fifth-place", votes: 2 },
        position: 5,
      },
    ];

    const sequence = getPodiumRevealSequence(rankedUsers);
    expect(
      sequence.map(({ position, user }) => `${position}:${user._id}`),
    ).toEqual([
      "3:third-place",
      "3:fourth-place-tie",
      "2:winner-b",
      "1:winner-a",
    ]);
    expect(
      getVisiblePodiumEntries(sequence, 1, 3).map(({ user }) => user._id),
    ).toEqual(["third-place"]);
    expect(
      getVisiblePodiumEntries(sequence, 2, 3).map(({ user }) => user._id),
    ).toEqual(["third-place", "fourth-place-tie"]);
    expect(
      getVisiblePodiumEntries(sequence, 3, 2).map(({ user }) => user._id),
    ).toEqual(["winner-b"]);

    expect(getRevealedResultIds(sequence, 4)).toEqual(
      new Set(["third-place", "fourth-place-tie", "winner-b", "winner-a"]),
    );
    expect(getRevealedResultIds(sequence, 3).has("winner-a")).toBe(false);
  });

  it("shows all podium trophies first, then reveals votes and each full profile", () => {
    expect(getPodiumEntryRevealState(0, 0, 2)).toEqual({
      showTrophy: true,
      showVotes: false,
      revealed: false,
    });
    expect(getPodiumEntryRevealState(0, 1, 2)).toEqual({
      showTrophy: true,
      showVotes: true,
      revealed: false,
    });
    expect(getPodiumEntryRevealState(0, 2, 2)).toEqual({
      showTrophy: false,
      showVotes: true,
      revealed: true,
    });
    expect(getPodiumEntryRevealState(1, 2, 2)).toEqual({
      showTrophy: true,
      showVotes: false,
      revealed: false,
    });
  });

  it("keeps unrevealed long names and zero-total values behind placeholders", () => {
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

    expect(html).toContain("1º lugar reservado");
    expect(html).not.toContain("Ana Beatriz de Oliveira Freitas da Silva");
    expect(html).toContain("Pessoa misteriosa");
    expect(html).toContain("00 votos · 00.00%");
    expect(html).not.toContain("NaN");
  });

  it("keeps three visual podium places with fewer than three candidates", () => {
    const html = renderToStaticMarkup(
      <ResultList {...props} users={[users[0]]} totalVotes={4} />,
    );

    expect(html).toContain("1º lugar reservado");
    expect(html).toContain('aria-label="2º lugar sem participante"');
    expect(html).toContain('aria-label="3º lugar sem participante"');
    expect(html).not.toContain("Demais participantes");
  });
});
