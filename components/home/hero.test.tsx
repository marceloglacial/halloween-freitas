import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/util/fonts", () => ({ secondaryFont: { className: "" } }));
vi.mock("@/components/background-video", () => ({
  default: () => <div aria-hidden="true" />,
}));
vi.mock("@/components/countdown", () => ({
  default: () => <div data-testid="countdown">Countdown</div>,
}));

import Hero from "@/components/home/hero";

describe("homepage hero RSVP call to action", () => {
  it("links to the existing RSVP section when registration is open", () => {
    const html = renderToStaticMarkup(
      <Hero
        startsAt="2026-11-01T00:00:00.000Z"
        showCountdown={true}
        showRsvpCta={true}
        initialNow="2026-10-15T12:00:00.000Z"
      />,
    );

    expect(html.indexOf("data-testid=\"countdown\"")).toBeLessThan(
      html.indexOf("href=\"#confirmacao\""),
    );
    expect(html).toContain("Confirme sua presença");
    expect(html).toContain("href=\"#confirmacao\"");
    expect(html).toContain("focus-visible:outline-2");
  });

  it("omits the CTA when registration is unavailable", () => {
    const html = renderToStaticMarkup(
      <Hero
        showCountdown={false}
        showRsvpCta={false}
        initialNow="2026-11-01T00:00:00.000Z"
      />,
    );

    expect(html).not.toContain("Confirme sua presença");
    expect(html).not.toContain("#confirmacao");
  });
});
