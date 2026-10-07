import { errorResponse } from "@/lib/http";

function retired() {
  return errorResponse(
    "Este acesso foi substituído. Entre com Google ou receba um código por email em /acesso.",
    410,
  );
}

export const GET = retired;
export const POST = retired;
export const DELETE = retired;
