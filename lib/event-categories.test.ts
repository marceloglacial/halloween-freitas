import { describe, expect, it } from "vitest";
import { parseEventCategories } from "@/lib/event-categories";

describe("event category configuration", () => {
  it("normalizes labels and sorts the configured order", () => {
    expect(
      parseEventCategories([
        { title: " Junior ", icon: "🎃", order: 1, eligibility: "junior" },
        { title: " Geral ", icon: "👻", order: 0, eligibility: "all" },
      ]),
    ).toEqual({
      value: [
        { title: "Geral", icon: "👻", order: 0, eligibility: "all" },
        { title: "Junior", icon: "🎃", order: 1, eligibility: "junior" },
      ],
    });
  });

  it.each([
    undefined,
    [],
    Array.from({ length: 31 }, (_, order) => ({
      title: `Categoria ${order}`,
      icon: "",
      order,
      eligibility: "all",
    })),
  ])("requires between one and thirty categories", (categories) => {
    expect(parseEventCategories(categories)).toEqual({
      error: "Configure ao menos uma categoria",
    });
  });

  it("rejects duplicate order values and unsupported eligibility", () => {
    expect(
      parseEventCategories([
        { title: "Geral", icon: "", order: 0, eligibility: "all" },
        { title: "Infantil", icon: "", order: 0, eligibility: "junior" },
      ]),
    ).toEqual({ error: "A ordem das categorias deve ser única e válida" });
    expect(
      parseEventCategories([
        { title: "Geral", icon: "", order: 0, eligibility: "everyone" },
      ]),
    ).toEqual({ error: "Elegibilidade da categoria inválida" });
  });

  it("rejects malformed category fields", () => {
    expect(
      parseEventCategories([
        { title: "x", icon: "", order: 0, eligibility: "all" },
      ]),
    ).toEqual({ error: "Nome ou ícone de categoria inválido" });
  });
});
