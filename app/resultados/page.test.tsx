import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getEvents: vi.fn(),
  resultsArePublic: vi.fn(),
  getCategories: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("@/components/back-button", () => ({
  default: ({ href, floating }: { href: string; floating?: boolean }) => (
    <a href={href} data-floating={floating ? "true" : undefined}>
      Voltar
    </a>
  ),
}));
vi.mock("@/components/feature-unavailable", () => ({
  default: ({ title, message }: { title: string; message: string }) => (
    <main>
      <h1>{title}</h1>
      <p>{message}</p>
    </main>
  ),
}));
vi.mock("@/lib/events", () => ({
  getEvents: mocks.getEvents,
  resultsArePublic: mocks.resultsArePublic,
}));
vi.mock("@/util/fonts", () => ({ secondaryFont: { className: "" } }));
vi.mock("@/util/get-categories", () => ({
  getCategories: mocks.getCategories,
}));

import ResultsPage from "@/app/resultados/page";

const publishedEvent: HalloweenEvent = {
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
const olderPublishedEvent: HalloweenEvent = {
  ...publishedEvent,
  _id: "event-2025",
  year: 2025,
  slug: "halloween-2025",
  title: "Halloween 2025",
};
const privateEvent: HalloweenEvent = {
  ...publishedEvent,
  _id: "event-2027",
  year: 2027,
  slug: "halloween-2027",
  title: "Halloween 2027",
  status: "active",
  votingStatus: "ended",
  resultsPublished: false,
};
const category: Category = {
  _id: "category-1",
  eventId: publishedEvent._id,
  title: "Fantasia mais criativa",
  icon: "🧙",
  order: 0,
  eligibility: "all",
};

describe("public results overview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getEvents.mockResolvedValue([
      privateEvent,
      publishedEvent,
      olderPublishedEvent,
    ]);
    mocks.resultsArePublic.mockImplementation(
      (event: HalloweenEvent) => event.resultsPublished,
    );
    mocks.getCategories.mockResolvedValue([category]);
  });

  it("shows published editions and the selected edition's categories", async () => {
    const page = await ResultsPage({
      searchParams: Promise.resolve({ event: publishedEvent.slug }),
    });
    const html = renderToStaticMarkup(page);

    expect(mocks.getCategories).toHaveBeenCalledWith(publishedEvent._id);
    expect(html).toContain("Halloween 2026");
    expect(html).toContain("Halloween 2025");
    expect(html).not.toContain("🏆");
    expect(html.indexOf("Halloween 2026")).toBeLessThan(
      html.indexOf("Resultados"),
    );
    expect(html).toContain('data-floating="true"');
    expect(html).not.toContain("Halloween 2027");
    expect(html).toContain('aria-label="Edições com resultados publicados"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain("lg:col-span-2 lg:col-start-3");
    expect(html).toContain('class="grid grid-cols-1');
    expect(html).toContain(
      `/resultados/${category._id}?event=${publishedEvent.slug}`,
    );
    expect(html).toContain("Fantasia mais criativa");
    expect(html).toContain('src="/hero-video.mp4"');
  });

  it("does not expose an unpublished edition or its categories", async () => {
    const page = await ResultsPage({
      searchParams: Promise.resolve({ event: privateEvent.slug }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Resultados indisponíveis");
    expect(html).not.toContain("Halloween 2027");
    expect(mocks.getCategories).not.toHaveBeenCalled();
  });

  it("shows an empty state when no edition has published results", async () => {
    mocks.getEvents.mockResolvedValue([privateEvent]);

    const page = await ResultsPage({ searchParams: Promise.resolve({}) });
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Nenhum resultado foi publicado ainda.");
    expect(mocks.getCategories).not.toHaveBeenCalled();
  });
});
