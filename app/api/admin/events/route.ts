import { MongoServerError, ObjectId } from "mongodb";
import { isAdmin } from "@/lib/auth/admin";
import { getDb, getMongoClient } from "@/lib/db";
import { parseEventInput } from "@/lib/event-schedule";
import { getEventById, getEvents } from "@/lib/events";
import { errorResponse, readJsonObject } from "@/lib/http";

export async function GET() {
  if (!(await isAdmin())) return errorResponse("Não autorizado", 401);
  try {
    return Response.json(await getEvents());
  } catch (error) {
    console.error("Admin event listing failed", error);
    return errorResponse("Não foi possível carregar os eventos", 500);
  }
}

export async function POST(request: Request) {
  if (!(await isAdmin())) return errorResponse("Não autorizado", 401);
  const body = await readJsonObject(request);
  const parsed = parseEventInput(body);
  if ("error" in parsed) return errorResponse(parsed.error, 400);
  const templateId =
    typeof body?.templateEventId === "string" &&
    ObjectId.isValid(body.templateEventId)
      ? new ObjectId(body.templateEventId)
      : null;
  if (!templateId) return errorResponse("Evento modelo inválido", 400);

  const client = await getMongoClient();
  const db = await getDb();
  const session = client.startSession();
  try {
    const createdId = await session.withTransaction(async () => {
      const template = await db
        .collection("events")
        .findOne({ _id: templateId }, { session });
      if (!template) throw new Error("TEMPLATE_NOT_FOUND");
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
      const categories = await db
        .collection("categories")
        .find({ eventId: templateId }, { session })
        .toArray();
      if (!categories.length) throw new Error("TEMPLATE_HAS_NO_CATEGORIES");

      const result = await db.collection("events").insertOne(
        {
          ...parsed.value,
          slug: `halloween-${parsed.value.year}`,
          status: "archived",
          votingStatus: "not_started",
          resultsPublished: false,
          createdAt: new Date(),
        },
        { session },
      );
      await db.collection("categories").insertMany(
        categories.map((category) => ({
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
    if (error instanceof Error && error.message === "TEMPLATE_NOT_FOUND") {
      return errorResponse("Evento modelo não encontrado", 404);
    }
    if (
      error instanceof Error &&
      error.message === "TEMPLATE_HAS_NO_CATEGORIES"
    ) {
      return errorResponse("O evento modelo não possui categorias", 409);
    }
    console.error("Admin event creation failed", error);
    return errorResponse("Não foi possível criar o evento", 500);
  } finally {
    await session.endSession();
  }
}
