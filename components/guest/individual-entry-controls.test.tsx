import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

import IndividualEntryControls from "@/components/guest/individual-entry-controls";

describe("individual contest entry controls", () => {
  it("explains that RSVP grants eligibility and requires a consented photo", () => {
    const html = renderToStaticMarkup(
      <IndividualEntryControls eventId="event-id" enabled />,
    );

    expect(html).toContain("Seu RSVP já permite participar");
    expect(html).toContain("Foto da fantasia");
    expect(html).toContain("Salvar participação");
    expect(html).not.toContain("Criar inscrição individual");
  });
});
