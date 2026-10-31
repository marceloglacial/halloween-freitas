import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { PublicContestGalleryEntry } from "@/lib/contestant-gallery";

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
vi.mock("@use-gesture/react", () => ({ useGesture: () => () => ({}) }));

import FotosPage from "@/components/pages/fotos/page";

const event = {
  _id: "507f1f77bcf86cd799439011",
  slug: "halloween-2026",
  title: "Halloween 2026",
};
const priorEvent = {
  _id: "507f1f77bcf86cd799439021",
  slug: "halloween-2025",
  title: "Halloween 2025",
};
const entry: PublicContestGalleryEntry = {
  _id: "507f1f77bcf86cd799439012",
  displayName: "Família Freitas",
  entryType: "group",
  categoryTitle: "Fantasia em grupo",
  categoryIcon: "👯",
  width: 800,
  height: 1200,
};

describe("contest photo gallery interface", () => {
  it("shows event navigation, searchable photo cards, and a private app URL", () => {
    const html = renderToStaticMarkup(
      <FotosPage
        entries={[entry]}
        events={[priorEvent, event]}
        selectedEvent={event}
        photoEventSlug={event.slug}
      />,
    );

    expect(html).toContain('aria-label="Edições"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain("Buscar fotos por nome ou categoria");
    expect(html).toContain("Fantasia em grupo");
    expect(html).toContain(
      "/api/contest-gallery/507f1f77bcf86cd799439012/photo?event=halloween-2026",
    );
    expect(html).not.toContain("cloudinary");
  });

  it("shows an explicit empty state", () => {
    const html = renderToStaticMarkup(
      <FotosPage
        entries={[]}
        events={[priorEvent, event]}
        selectedEvent={event}
        photoEventSlug={event.slug}
      />,
    );
    expect(html).toContain(
      "Ainda não há fotos de fantasias disponíveis nesta edição.",
    );
  });
});
