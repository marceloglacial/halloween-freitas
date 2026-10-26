import { describe, expect, it } from "vitest";
import {
  DEFAULT_EVENT_CATEGORIES,
  parseEventCategories,
} from "@/lib/event-categories";

describe("event category configuration", () => {
  it("defines the six ordered Brazilian Portuguese default categories", () => {
    expect(DEFAULT_EVENT_CATEGORIES).toEqual([
      { title: "Melhor Fantasia", icon: "🏆", order: 0, eligibility: "all" },
      { title: "Pior Fantasia", icon: "💩", order: 1, eligibility: "all" },
      {
        title: "Fantasia Mais Assustadora",
        icon: "🧟",
        order: 2,
        eligibility: "all",
      },
      {
        title: "Fantasia Mais Engraçada",
        icon: "🤡",
        order: 3,
        eligibility: "all",
      },
      {
        title: "Melhor Fantasia de Grupo ou Dupla",
        icon: "👯‍♀️",
        order: 4,
        eligibility: "group",
      },
      { title: "Fantasia Mais Sexy", icon: "🔥", order: 5, eligibility: "all" },
    ]);
  });

  it("normalizes labels and sorts the configured order", () => {
    expect(
      parseEventCategories([
        { title: " Grupo ", icon: "🎃", order: 1, eligibility: "group" },
        { title: " Geral ", icon: "👻", order: 0, eligibility: "all" },
      ]),
    ).toEqual({
      value: [
        { title: "Geral", icon: "👻", order: 0, eligibility: "all" },
        { title: "Grupo", icon: "🎃", order: 1, eligibility: "group" },
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
        { title: "Grupos", icon: "", order: 0, eligibility: "group" },
      ]),
    ).toEqual({ error: "A ordem das categorias deve ser única e válida" });
    expect(
      parseEventCategories([
        { title: "Infantil", icon: "", order: 0, eligibility: "junior" },
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
