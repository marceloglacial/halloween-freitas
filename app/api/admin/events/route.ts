import { MongoServerError } from "mongodb";
import { isAdmin } from "@/lib/auth/admin";
import { getDb, getMongoClient } from "@/lib/db";
import { DEFAULT_EVENT_CATEGORIES } from "@/lib/event-categories";
import { parseEventInput } from "@/lib/event-schedule";
import { getEventById, getEvents } from "@/lib/events";
import { errorResponse, readJsonObject, logServerError } from "@/lib/http";

export async function GET() {
  if (!(await isAdmin())) return errorResponse("Não autorizado", 401);
  try {
    return Response.json(await getEvents());
  } catch (error) {
    logServerError("Admin event listing failed", error);
    return errorResponse("Não foi possível carregar os eventos", 500);
  }
}

export async function POST(request: Request) {
  if (!(await isAdmin())) return errorResponse("Não autorizado", 401);
  const body = await readJsonObject(request);
  const parsed = parseEventInput(body);
  if ("error" in parsed) return errorResponse(parsed.error, 400);
  if (body?.categories !== undefined || body?.templateEventId !== undefined) {
    return errorResponse(
      "As categorias padrão são criadas automaticamente; edite-as após criar o evento",
      400,
    );
  }

  const client = await getMongoClient();
  const db = await getDb();
  const session = client.startSession();
  try {
    const createdId = await session.withTransaction(async () => {
      const duplicateYear = await db.collection("events").findOne(
        {
          $or: [
            { year: parsed.value.year },
            { slug: `halloween-${parsed.value.year}` },
          ],
        },
        { session },
      );
      if (duplicateYear) throw new Error("DUPLICATE_YEAR");

      const result = await db.collection("events").insertOne(
        {
          ...parsed.value,
          slug: `halloween-${parsed.value.year}`,
          status: "archived",
          contestEntryStatus: "open",
          votingStatus: "not_started",
          resultsPublished: false,
          createdAt: new Date(),
        },
        { session },
      );
      await db.collection("categories").insertMany(
        DEFAULT_EVENT_CATEGORIES.map((category) => ({
          title: category.title,
          icon: category.icon,
          order: category.order,
          eligibility: category.eligibility,
          eventId: result.insertedId,
        })),
        { session },
      );
      return result.insertedId.toString();
    });
    if (!createdId) throw new Error("EVENT_NOT_CREATED");
    const event = await getEventById(createdId);
    return Response.json(event, { status: 201 });
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      return errorResponse("Já existe um evento para este ano", 409);
    }
    if (error instanceof Error && error.message === "DUPLICATE_YEAR") {
      return errorResponse("Já existe um evento para este ano", 409);
    }
    logServerError("Admin event creation failed", error);
    return errorResponse("Não foi possível criar o evento", 500);
  } finally {
    await session.endSession();
  }
}
