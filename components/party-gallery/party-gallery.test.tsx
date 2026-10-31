import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PartyGallery } from "@/components/party-gallery/party-gallery";

describe("party gallery public states", () => {
  it("shows only the waiting message for a private album", () => {
    const html = renderToStaticMarkup(
      createElement(PartyGallery, {
        event: {
          slug: "halloween-2026",
          title: "Secret edition title",
          year: 2026,
        },
        published: false,
        initialPhotos: [
          {
            photoId: "private-photo-id",
            previewUrl: "https://private-preview-url",
            width: 1800,
            height: 1200,
          },
        ],
      }),
    );

    expect(html).toContain("Este álbum aguarda a liberação do anfitrião.");
    expect(html).not.toContain("Secret edition title");
    expect(html).not.toContain("private-photo-id");
    expect(html).not.toContain("private-preview-url");
    expect(html).not.toContain("1800");
  });

  it("shows an empty state for a published album without photos", () => {
    const html = renderToStaticMarkup(
      createElement(PartyGallery, {
        event: {
          slug: "halloween-2026",
          title: "Halloween dos Freitas",
          year: 2026,
        },
        published: true,
        initialPhotos: [],
      }),
    );

    expect(html).not.toContain("Halloween dos Freitas");
    expect(html).toContain("Ainda não há fotos publicadas nesta edição.");
    expect(html).toContain("Adicionar mais fotos");
    expect(html).toContain(
      "/meu-halloween/fotos-da-festa?event=halloween-2026",
    );
  });

  it("renders a large album as lazy responsive photo controls", () => {
    const photos = Array.from({ length: 80 }, (_, index) => ({
      photoId: `507f1f77bcf86cd7994390${index.toString().padStart(2, "0")}`,
      previewUrl: `/api/party-gallery/photo-${index}?event=halloween-2026`,
      width: 1600,
      height: 1200,
    }));
    const html = renderToStaticMarkup(
      createElement(PartyGallery, {
        event: {
          slug: "halloween-2026",
          title: "Halloween dos Freitas",
          year: 2026,
        },
        published: true,
        initialPhotos: photos,
      }),
    );

    expect(html.match(/Ampliar foto [0-9]+ do álbum da festa/g)).toHaveLength(
      80,
    );
    expect(html.match(/loading="lazy"/g)).toHaveLength(80);
    expect(html).toContain("grid-cols-2");
    expect(html).toContain("lg:grid-cols-4");
  });
});
