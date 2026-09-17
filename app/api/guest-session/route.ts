import {
  clearGuestSession,
  createGuestSession,
  getGuestSession,
} from "@/lib/auth/guest-session";
import { getCurrentEvent, isVotingOpen } from "@/lib/events";
import { errorResponse, normalizeEmail, readJsonObject } from "@/lib/http";
import { getUserByEmail } from "@/lib/users";

export async function GET() {
  const session = await getGuestSession();
  return Response.json(
    session
      ? { authenticated: true, fullName: session.fullName }
      : { authenticated: false },
  );
}

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    if (!body) return errorResponse("Corpo da requisição inválido", 400);
    const normalizedEmail = normalizeEmail(body.email);
    if (!normalizedEmail) return errorResponse("Email inválido", 400);

    const event = await getCurrentEvent();
    if (!event || !isVotingOpen(event)) {
      return errorResponse("A votação não está aberta", 403);
    }

    const user = await getUserByEmail(event._id, normalizedEmail);
    if (!user) return errorResponse("Usuário não encontrado", 404);

    await createGuestSession(user);
    return Response.json({ fullName: user.fullName });
  } catch (error) {
    console.error("Guest session creation failed", error);
    return errorResponse("Não foi possível iniciar a sessão", 500);
  }
}

export async function DELETE() {
  await clearGuestSession();
  return new Response(null, { status: 204 });
}
