import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/util/fonts", () => ({ secondaryFont: { className: "" } }));

import Schedule from "@/components/home/schedule";
import { HomeCategoriesProvider } from "@/components/home/home-categories-context";

function renderSchedule(categories: Category[]) {
  return renderToStaticMarkup(
    <HomeCategoriesProvider categories={categories}>
      <Schedule />
    </HomeCategoriesProvider>,
  );
}

describe("homepage awards categories", () => {
  it("renders configured category names and icons in their supplied order", () => {
    const categories: Category[] = [
      {
        _id: "category-1",
        eventId: "event-1",
        title: "Melhor Fantasia",
        icon: "🏆",
        order: 0,
        eligibility: "all",
      },
      {
        _id: "category-2",
        eventId: "event-1",
        title: "Fantasia Mais Assustadora",
        icon: "🧟",
        order: 1,
        eligibility: "all",
      },
    ];
    const markup = renderSchedule(categories);

    expect(markup).toContain("Premiação para as Categorias");
    expect(markup).toContain("🧟 Fantasia Mais Assustadora");
    expect(markup).toContain("🏆 Melhor Fantasia");
    expect(markup.indexOf("🏆 Melhor Fantasia")).toBeLessThan(
      markup.indexOf("🧟 Fantasia Mais Assustadora"),
    );
  });

  it("shows changed names and order after refreshed category data arrives", () => {
    const before = renderSchedule([
      {
        _id: "category-1",
        eventId: "event-1",
        title: "Nome anterior",
        icon: "🏆",
        order: 0,
        eligibility: "all",
      },
    ]);
    const after = renderSchedule([
      {
        _id: "category-2",
        eventId: "event-1",
        title: "Nova categoria",
        icon: "🦇",
        order: 0,
        eligibility: "all",
      },
    ]);

    expect(before).toContain("🏆 Nome anterior");
    expect(after).toContain("🦇 Nova categoria");
    expect(after).not.toContain("Nome anterior");
  });
});
