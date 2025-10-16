import { NextResponse } from "next/server";
import { getUsers } from "@/util/get-users";

export async function GET() {
  try {
    const users = await getUsers();
    return NextResponse.json(users);
  } catch (err) {
    return NextResponse.json([], { status: 500 });
  }
}
