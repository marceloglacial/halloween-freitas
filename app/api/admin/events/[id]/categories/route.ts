import { ObjectId } from "mongodb";
import type { ClientSession } from "mongodb";
import { isAdmin } from "@/lib/auth/admin";
import { getDb, getMongoClient } from "@/lib/db";
import { parseEventCategories } from "@/lib/event-categories";
import { getEventById } from "@/lib/events";
import { errorResponse, logServerError, readJsonObject } from "@/lib/http";
import { getCategories } from "@/util/get-categories";

type CategoryDocument = Pick<
  Category,
  "title" | "icon" | "order" | "eligibility"
> & {
  _id: ObjectId;
  eventId: ObjectId;
};

const unlockedVotingState = {
  $or: [{ votingStatus: "not_started" }, { votingStatus: { $exists: false } }],
};

function errorStatus(error: unknown) {
  if (!(error instanceof Error)) return null;
  if (error.message === "EVENT_NOT_FOUND") return 404;
  if (error.message === "VOTING_LOCKED") return 409;
  if (error.message === "CATEGORY_IN_USE") return 409;
  if (error.message === "CATEGORY_ID_INVALID") return 400;
  return null;
}

function errorMessage(error: unknown) {
  if (!(error instanceof Error))
    return "Não foi possível atualizar as categorias";
  switch (error.message) {
    case "EVENT_NOT_FOUND":
      return "Evento não encontrado";
    case "VOTING_LOCKED":
      return "As categorias não podem ser alteradas após o início da votação";
    case "CATEGORY_IN_USE":
      return "Não é possível remover uma categoria que já possui votos";
    case "CATEGORY_ID_INVALID":
      return "Categoria inválida para este evento";
    default:
      return "Não foi possível atualizar as categorias";
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin())) return errorResponse("Não autorizado", 401);
  const { id } = await params;
  if (!ObjectId.isValid(id)) return errorResponse("Evento inválido", 400);

  try {
    const event = await getEventById(id);
    if (!event) return errorResponse("Evento não encontrado", 404);
    return Response.json(await getCategories(id));
  } catch (error) {
    logServerError("Admin event categories lookup failed", error);
    return errorResponse("Não foi possível carregar as categorias", 500);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin())) return errorResponse("Não autorizado", 401);
  const { id } = await params;
  if (!ObjectId.isValid(id)) return errorResponse("Evento inválido", 400);

  const body = await readJsonObject(request);
  const rawCategories = body?.categories;
  const parsed = parseEventCategories(rawCategories);
  if ("error" in parsed) return errorResponse(parsed.error, 400);

  const categoryIdsByOrder = new Map<number, ObjectId>();
  for (const item of rawCategories as Record<string, unknown>[]) {
    if (item._id === undefined) continue;
    if (typeof item._id !== "string" || !ObjectId.isValid(item._id)) {
      return errorResponse("Categoria inválida para este evento", 400);
    }
    categoryIdsByOrder.set(Number(item.order), new ObjectId(item._id));
  }

  const eventId = new ObjectId(id);
  let session: ClientSession | undefined;
  try {
    const client = await getMongoClient();
    const db = await getDb();
    session = client.startSession();
    await session.withTransaction(async () => {
      const events = db.collection("events");
      const event = await events.findOne({ _id: eventId }, { session });
      if (!event) throw new Error("EVENT_NOT_FOUND");
      const guard = await events.updateOne(
        { _id: eventId, ...unlockedVotingState },
        { $set: { updatedAt: new Date() } },
        { session },
      );
      if (!guard.matchedCount) throw new Error("VOTING_LOCKED");

      const categories = db.collection<CategoryDocument>("categories");
      const current = await categories.find({ eventId }, { session }).toArray();
      const currentById = new Map(
        current.map((category) => [category._id.toString(), category]),
      );
      const submittedIds = [...categoryIdsByOrder.values()];
      if (
        new Set(submittedIds.map((categoryId) => categoryId.toString()))
          .size !== submittedIds.length
      ) {
        throw new Error("CATEGORY_ID_INVALID");
      }
      if (
        submittedIds.some(
          (categoryId) => !currentById.has(categoryId.toString()),
        )
      ) {
        throw new Error("CATEGORY_ID_INVALID");
      }

      const retainedIds = new Set(
        submittedIds.map((categoryId) => categoryId.toString()),
      );
      const removed = current.filter(
        (category) => !retainedIds.has(category._id.toString()),
      );
      if (removed.length) {
        const used = await db.collection("votes").findOne(
          {
            eventId,
            categoryId: { $in: removed.map((category) => category._id) },
          },
          { projection: { _id: 1 }, session },
        );
        if (used) throw new Error("CATEGORY_IN_USE");
        await categories.deleteMany(
          { eventId, _id: { $in: removed.map((category) => category._id) } },
          { session },
        );
      }

      const retained = current.filter((category) =>
        retainedIds.has(category._id.toString()),
      );
      const minimumOrder = Math.min(-1, ...current.map(({ order }) => order));
      for (const [index, category] of retained.entries()) {
        await categories.updateOne(
          { _id: category._id, eventId },
          { $set: { order: minimumOrder - index - 1 } },
          { session },
        );
      }

      const newCategories: CategoryDocument[] = [];
      for (const category of parsed.value) {
        const existingId = categoryIdsByOrder.get(category.order);
        if (existingId) {
          await categories.updateOne(
            { _id: existingId, eventId },
            { $set: category },
            { session },
          );
        } else {
          newCategories.push({ ...category, _id: new ObjectId(), eventId });
        }
      }
      if (newCategories.length)
        await categories.insertMany(newCategories, { session });
    });

    return Response.json(await getCategories(id));
  } catch (error) {
    const status = errorStatus(error);
    if (status) return errorResponse(errorMessage(error), status);
    logServerError("Admin event categories update failed", error);
    return errorResponse("Não foi possível atualizar as categorias", 500);
  } finally {
    if (session) await session.endSession();
  }
}
