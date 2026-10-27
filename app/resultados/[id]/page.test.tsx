import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  notFound: vi.fn(),
  getEventBySlug: vi.fn(),
  resultsArePublic: vi.fn(),
  getCategoryResults: vi.fn(),
  getFinalVotingRoundForCategory: vi.fn(),
  getCategoryById: vi.fn(),
}));

vi.mock("next/navigation", () => ({ notFound: mocks.notFound }));
vi.mock("@/components/back-button", () => ({
  default: ({ href }: { href: string }) => <a href={href}>Voltar</a>,
}));
vi.mock("@/util/fonts", () => ({
  secondaryFont: { className: "theme-font" },
}));
vi.mock("@/components/feature-unavailable", () => ({
  default: ({ title, message }: { title: string; message: string }) => (
    <main>
      <h1>{title}</h1>
      <p>{message}</p>
    </main>
  ),
}));
vi.mock("@/components/results/result-list", () => ({
  ResultList: ({
    users,
    totalVotes,
    eventTitle,
    categoryTitle,
  }: Results & {
    eventTitle: string;
    categoryTitle: string;
  }) => (
    <section aria-label="Classificação final">
      <p>{eventTitle}</p>
      <h1>{categoryTitle}</h1>
      <p>{totalVotes} votos no total</p>
      {users.map((user) => (
        <p key={user._id}>{user.fullName}</p>
      ))}
    </section>
  ),
}));
vi.mock("@/lib/events", () => ({
  getEventBySlug: mocks.getEventBySlug,
  resultsArePublic: mocks.resultsArePublic,
}));
vi.mock("@/lib/results", () => ({
  getCategoryResults: mocks.getCategoryResults,
}));
vi.mock("@/lib/voting-rounds", () => ({
  getFinalVotingRoundForCategory: mocks.getFinalVotingRoundForCategory,
}));
vi.mock("@/util/get-categories", () => ({
  getCategoryById: mocks.getCategoryById,
}));

import ResultPage from "@/app/resultados/[id]/page";

const event: HalloweenEvent = {
  _id: "event-2026",
  year: 2026,
  slug: "halloween-2026",
  title: "Halloween 2026",
  timezone: "America/Toronto",
  registrationStartsAt: "2026-09-01T00:00:00.000Z",
  eventStartsAt: "2026-10-31T22:00:00.000Z",
  status: "archived",
  votingStatus: "ended",
  resultsPublished: true,
};
const category: Category = {
  _id: "category-1",
  eventId: event._id,
  title: "Fantasia mais criativa",
  icon: "🧙",
  order: 0,
  eligibility: "all",
};
const round = {
  _id: { toString: () => "round-final" },
  eventId: event._id,
  type: "primary" as const,
  status: "ended" as const,
  categoryIds: [category._id],
};

describe("public category results", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.notFound.mockImplementation(() => {
      throw new Error("NOT_FOUND");
    });
    mocks.getEventBySlug.mockResolvedValue(event);
    mocks.resultsArePublic.mockImplementation(
      (candidateEvent: HalloweenEvent) => candidateEvent.resultsPublished,
    );
    mocks.getCategoryById.mockResolvedValue(category);
    mocks.getFinalVotingRoundForCategory.mockResolvedValue(round);
    mocks.getCategoryResults.mockResolvedValue({
      users: [
        {
          _id: "candidate-1",
          eventId: event._id,
          fullName: "Ana Freitas",
          votes: 4,
          imageUrl: null,
        },
      ],
      totalVotes: 4,
    });
  });

  it("renders the selected edition's final round results", async () => {
    const page = await ResultPage({
      params: Promise.resolve({ id: category._id }),
      searchParams: Promise.resolve({ event: event.slug }),
    });
    const html = renderToStaticMarkup(page);

    expect(mocks.getCategoryById).toHaveBeenCalledWith(category._id);
    expect(mocks.getFinalVotingRoundForCategory).toHaveBeenCalledWith(
      event._id,
      category._id,
    );
    expect(mocks.getCategoryResults).toHaveBeenCalledWith(
      event._id,
      category._id,
      "round-final",
    );
    expect(html).toContain("Ana Freitas");
    expect(html).toContain("Halloween 2026");
    expect(html).toContain("Fantasia mais criativa");
    expect(html.indexOf("Halloween 2026")).toBeLessThan(
      html.indexOf("Fantasia mais criativa"),
    );
    expect(html).not.toContain("🧙");
    expect(html).toContain("4 votos no total");
  });

  it("hides results when publication is revoked", async () => {
    mocks.getEventBySlug.mockResolvedValue({
      ...event,
      resultsPublished: false,
    });

    const page = await ResultPage({
      params: Promise.resolve({ id: category._id }),
      searchParams: Promise.resolve({ event: event.slug }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Resultados indisponíveis");
    expect(mocks.getFinalVotingRoundForCategory).not.toHaveBeenCalled();
    expect(mocks.getCategoryResults).not.toHaveBeenCalled();
  });

  it("does not mix a category from another edition", async () => {
    mocks.getCategoryById.mockResolvedValue({
      ...category,
      eventId: "event-2025",
    });

    await expect(
      ResultPage({
        params: Promise.resolve({ id: category._id }),
        searchParams: Promise.resolve({ event: event.slug }),
      }),
    ).rejects.toThrow("NOT_FOUND");
    expect(mocks.getFinalVotingRoundForCategory).not.toHaveBeenCalled();
  });

  it("provides an explicit zero-vote state", async () => {
    mocks.getFinalVotingRoundForCategory.mockResolvedValue(null);

    const page = await ResultPage({
      params: Promise.resolve({ id: category._id }),
      searchParams: Promise.resolve({ event: event.slug }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Nenhum voto nesta categoria.");
    expect(html).toContain("Halloween 2026");
    expect(html.indexOf("Halloween 2026")).toBeLessThan(
      html.indexOf("Fantasia mais criativa"),
    );
    expect(html).toContain('src="/hero-video.mp4"');
    expect(html).not.toContain("Classificação final");
  });

  it("keeps the zero-vote state when eligible candidates have no ballots", async () => {
    mocks.getCategoryResults.mockResolvedValue({
      users: [
        {
          _id: "candidate-without-votes",
          eventId: event._id,
          fullName: "Beatriz Freitas",
          votes: 0,
          imageUrl: null,
        },
      ],
      totalVotes: 0,
    });

    const page = await ResultPage({
      params: Promise.resolve({ id: category._id }),
      searchParams: Promise.resolve({ event: event.slug }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Nenhum voto nesta categoria.");
    expect(html).not.toContain("Classificação final");
    expect(html).not.toContain("Beatriz Freitas");
  });
});
