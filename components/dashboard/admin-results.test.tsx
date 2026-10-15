import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AdminTallyContent } from "@/components/dashboard/admin-results";

describe("private admin tally presentation", () => {
  it("shows all leaders tied for first and leaves competition-rank gaps", () => {
    const html = renderToStaticMarkup(
      createElement(AdminTallyContent, {
        tally: {
          eventId: "event-a",
          votingStatus: "ended",
          resultsPublished: false,
          participantCount: 3,
          categories: [
            {
              categoryId: "category-a",
              title: "Fantasia",
              icon: "🎃",
              roundType: "runoff",
              roundStatus: "ended",
              totalVotes: 7,
              users: [
                { _id: "a", fullName: "Ana", votes: 3 },
                { _id: "b", fullName: "Bia", votes: 3 },
                { _id: "c", fullName: "Caio", votes: 1 },
              ],
            },
          ],
        },
      }),
    );

    expect(html.match(/🥇/g)).toHaveLength(2);
    expect(html).toContain("Primeiro lugar");
    expect(html).toContain("3º");
    expect(html).toContain("Rodada de desempate");
  });

  it("states that an ended category with no ballots has no winner", () => {
    const html = renderToStaticMarkup(
      createElement(AdminTallyContent, {
        tally: {
          eventId: "event-a",
          votingStatus: "ended",
          resultsPublished: false,
          participantCount: 0,
          categories: [
            {
              categoryId: "category-a",
              title: "Fantasia",
              icon: "🎃",
              roundType: "primary",
              roundStatus: "ended",
              totalVotes: 0,
              users: [],
            },
          ],
        },
      }),
    );

    expect(html).toContain("Nenhum voto foi registrado nesta categoria");
    expect(html).toContain("Não há vencedor.");
  });
});
