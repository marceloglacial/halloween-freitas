export type EventCategoryInput = Pick<
  Category,
  "title" | "icon" | "order" | "eligibility"
>;

export const DEFAULT_EVENT_CATEGORIES = [
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
  {
    title: "Melhor Fantasia Infantil",
    icon: "🧒",
    order: 5,
    eligibility: "junior",
  },
  {
    title: "Fantasia Mais Sexy",
    icon: "🔥",
    order: 6,
    eligibility: "all",
  },
] satisfies readonly EventCategoryInput[];

const eligibilityValues = ["all", "group", "junior"] as const;

export function parseEventCategories(
  value: unknown,
): { value: EventCategoryInput[] } | { error: string } {
  if (!Array.isArray(value) || value.length === 0 || value.length > 30) {
    return { error: "Configure ao menos uma categoria" };
  }

  const categories: EventCategoryInput[] = [];
  const orders = new Set<number>();
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return { error: "Configuração de categoria inválida" };
    }
    const category = item as Record<string, unknown>;
    const title =
      typeof category.title === "string" ? category.title.trim() : "";
    const icon = typeof category.icon === "string" ? category.icon.trim() : "";
    const order = category.order;
    const eligibility = category.eligibility;

    if (title.length < 2 || title.length > 80 || icon.length > 16) {
      return { error: "Nome ou ícone de categoria inválido" };
    }
    if (
      typeof order !== "number" ||
      !Number.isInteger(order) ||
      order < 0 ||
      orders.has(Number(order))
    ) {
      return { error: "A ordem das categorias deve ser única e válida" };
    }
    if (
      typeof eligibility !== "string" ||
      !eligibilityValues.includes(
        eligibility as (typeof eligibilityValues)[number],
      )
    ) {
      return { error: "Elegibilidade da categoria inválida" };
    }
    orders.add(Number(order));
    categories.push({
      title,
      icon,
      order,
      eligibility: eligibility as EventCategoryInput["eligibility"],
    });
  }

  return { value: categories.sort((left, right) => left.order - right.order) };
}
