import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { vi } from "vitest";

vi.mock("@/util/fonts", () => ({ secondaryFont: { className: "" } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

import EventLifecycle from "@/components/home/event-lifecycle";
import Schedule from "@/components/home/schedule";

describe("homepage event lifecycle", () => {
  it("renders only the waiting view when no active edition exists", () => {
    const html = renderToStaticMarkup(
      <EventLifecycle
        initialEvent={null}
        initialCategories={[]}
        initialNow="2026-10-31T23:59:59.999Z"
        initialRsvpOpen={false}
        heroContent={<h1>Halloween dos Freitas</h1>}
        footerContent={<footer>Footer</footer>}
        preEventContent={
          <>
            <section>RSVP</section>
            <Schedule />
          </>
        }
        postEventContent={<section>Resultados</section>}
      />,
    );

    expect(html).toContain("Aguardando o próximo evento");
    expect(html).not.toContain("Resultados");
    expect(html).not.toContain("RSVP");
    expect(html).not.toContain("Footer");
    expect(html).not.toContain("Premiação para as Categorias");
  });

  it("provides the active edition categories to the homepage awards section", () => {
    const category: Category = {
      _id: "category-1",
      eventId: "event-1",
      title: "Melhor Fantasia Infantil",
      icon: "🧒",
      order: 5,
      eligibility: "junior",
    };
    const html = renderToStaticMarkup(
      <EventLifecycle
        initialEvent={{
          _id: "event-1",
          year: 2026,
          slug: "halloween-2026",
          title: "Halloween 2026",
          timezone: "America/Toronto",
          registrationStartsAt: "2026-09-01T04:00:00.000Z",
          eventStartsAt: "2026-11-01T00:00:00.000Z",
          votingStatus: "not_started",
          resultsPublished: false,
          status: "active",
        }}
        initialCategories={[category]}
        initialNow="2026-10-14T12:00:00.000Z"
        initialRsvpOpen={true}
        heroContent={<h1>Halloween dos Freitas</h1>}
        footerContent={<footer>Footer</footer>}
        preEventContent={<Schedule />}
        postEventContent={<section>Resultados</section>}
      />,
    );

    expect(html).toContain("Premiação para as Categorias");
    expect(html).toContain("🧒 Melhor Fantasia Infantil");
  });
});
