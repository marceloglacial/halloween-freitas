import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import BackButton from "./index";

describe("BackButton", () => {
  it("can float at the lower left when requested", () => {
    const html = renderToStaticMarkup(
      <BackButton href="/resultados" floating />,
    );

    expect(html).toContain("fixed bottom-5 left-4");
    expect(html).toContain('href="/resultados"');
    expect(html).toContain("Voltar");
  });

  it("keeps the existing top-right placement by default", () => {
    const html = renderToStaticMarkup(<BackButton href="/" />);

    expect(html).toContain("absolute top-8 right-8");
    expect(html).not.toContain("fixed bottom-5 left-4");
  });
});
