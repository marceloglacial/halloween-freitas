import { MongoServerError, ObjectId } from "mongodb";
import { isAdmin } from "@/lib/auth/admin";
import { getDb } from "@/lib/db";
import { getEventById } from "@/lib/events";
import {
  errorResponse,
  normalizeEmail,
  normalizeName,
  parseObjectId,
  readJsonObject,
} from "@/lib/http";
import { getUsersForEvent } from "@/lib/users";

async function adminEvent(eventId: unknown) {
  if (!(await isAdmin())) return errorResponse("Não autorizado", 401);
  if (typeof eventId !== "string" || !ObjectId.isValid(eventId)) {
    return errorResponse("Evento inválido", 400);
  }
  const event = await getEventById(eventId);
  return event ?? errorResponse("Evento não encontrado", 404);
}

export async function GET(request: Request) {
  try {
    const event = await adminEvent(
      new URL(request.url).searchParams.get("eventId"),
    );
    if (event instanceof Response) return event;
    return Response.json(await getUsersForEvent(event._id));
  } catch (error) {
    console.error("Admin user listing failed", error);
    return errorResponse("Não foi possível carregar os usuários", 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    if (!body) return errorResponse("Corpo da requisição inválido", 400);
    const event = await adminEvent(body.eventId);
    if (event instanceof Response) return event;
    const fullName = normalizeName(body.fullName);
    const normalizedEmail = normalizeEmail(body.email);
    if (!fullName || !normalizedEmail) {
      return errorResponse("Nome ou email inválido", 400);
    }

    const result = await (await getDb()).collection("users").insertOne({
      eventId: new ObjectId(event._id),
      fullName,
      email: normalizedEmail,
      normalizedEmail,
      imageUrl: typeof body.imageUrl === "string" ? body.imageUrl : null,
      group: Boolean(body.group),
      junior: Boolean(body.junior),
      createdAt: new Date(),
    });
    return Response.json(
      {
        _id: result.insertedId.toString(),
        eventId: event._id,
        fullName,
        email: normalizedEmail,
        imageUrl: typeof body.imageUrl === "string" ? body.imageUrl : null,
        group: Boolean(body.group),
        junior: Boolean(body.junior),
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      return errorResponse("Este email já está inscrito", 409);
    }
    console.error("Admin user creation failed", error);
    return errorResponse("Não foi possível criar o usuário", 500);
  }
}

export async function PUT(request: Request) {
  try {
    const body = await readJsonObject(request);
    if (!body) return errorResponse("Corpo da requisição inválido", 400);
    const event = await adminEvent(body.eventId);
    if (event instanceof Response) return event;
    const userId = parseObjectId(body._id);
    const fullName = normalizeName(body.fullName);
    const normalizedEmail = normalizeEmail(body.email);
    if (!userId || !fullName || !normalizedEmail) {
      return errorResponse("Dados inválidos", 400);
    }

    const update = {
      fullName,
      email: normalizedEmail,
      normalizedEmail,
      imageUrl: typeof body.imageUrl === "string" ? body.imageUrl : null,
      group: Boolean(body.group),
      junior: Boolean(body.junior),
      updatedAt: new Date(),
    };
    const result = await (
      await getDb()
    )
      .collection("users")
      .updateOne(
        { _id: userId, eventId: new ObjectId(event._id) },
        { $set: update },
      );
    if (!result.matchedCount)
      return errorResponse("Usuário não encontrado", 404);
    return Response.json({ _id: body._id, eventId: event._id, ...update });
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      return errorResponse("Este email já está inscrito", 409);
    }
    console.error("Admin user update failed", error);
    return errorResponse("Não foi possível atualizar o usuário", 500);
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await readJsonObject(request);
    if (!body) return errorResponse("Corpo da requisição inválido", 400);
    const event = await adminEvent(body.eventId);
    if (event instanceof Response) return event;
    const userId = parseObjectId(body._id);
    if (!userId) return errorResponse("Usuário inválido", 400);

    const db = await getDb();
    const hasVotes = await db.collection("votes").findOne({
      eventId: new ObjectId(event._id),
      $or: [{ voterId: userId }, { voteForId: userId }],
    });
    if (hasVotes) {
      return errorResponse("Usuários com votos não podem ser excluídos", 409);
    }
    const result = await db.collection("users").deleteOne({
      _id: userId,
      eventId: new ObjectId(event._id),
    });
    if (!result.deletedCount)
      return errorResponse("Usuário não encontrado", 404);
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Admin user deletion failed", error);
    return errorResponse("Não foi possível excluir o usuário", 500);
  }
}
