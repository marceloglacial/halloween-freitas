import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { vi } from "vitest";

vi.mock("@/util/fonts", () => ({ secondaryFont: { className: "" } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

import EventLifecycle from "@/components/home/event-lifecycle";

describe("homepage event lifecycle", () => {
  it("renders only the waiting view when no active edition exists", () => {
    const html = renderToStaticMarkup(
      <EventLifecycle
        initialEvent={null}
        initialNow="2026-10-31T23:59:59.999Z"
        heroContent={<h1>Halloween dos Freitas</h1>}
        footerContent={<footer>Footer</footer>}
        preEventContent={<section>RSVP</section>}
        postEventContent={<section>Resultados</section>}
      />,
    );

    expect(html).toContain("Aguardando o próximo evento");
    expect(html).not.toContain("Resultados");
    expect(html).not.toContain("RSVP");
    expect(html).not.toContain("Footer");
  });
});
