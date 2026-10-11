import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import CategoryLink from "@/components/votacao/category-link";

vi.mock("@/util/fonts", () => ({
  secondaryFont: { className: "secondary-font" },
}));

const category = {
  _id: "507f1f77bcf86cd799439011",
  eventId: "507f1f77bcf86cd799439012",
  title: "Fantasia",
  icon: "🎃",
  order: 1,
  eligibility: "all" as const,
};

describe("voting category link", () => {
  it("links to an unfinished category with its event context", () => {
    const html = renderToStaticMarkup(
      <CategoryLink
        category={category}
        alreadyVoted={false}
        firstClassname=""
      />,
    );

    expect(html).toContain(
      `/votacao/categories/${category._id}?eventId=${category.eventId}`,
    );
    expect(html).toContain("Votar nesta categoria");
  });

  it("shows completed categories as status instead of a dead link", () => {
    const html = renderToStaticMarkup(
      <CategoryLink category={category} alreadyVoted firstClassname="" />,
    );

    expect(html).toContain("Fantasia: concluída");
    expect(html).toContain("Concluída");
    expect(html).not.toContain("href=");
  });
});
