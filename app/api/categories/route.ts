import { NextResponse } from "next/server";
import { getCategories } from "@/util/get-categories";
import { getCurrentEvent, getEventBySlug } from "@/lib/events";

export async function GET(request: Request) {
  try {
    const slug = new URL(request.url).searchParams.get("event");
    const event = slug ? await getEventBySlug(slug) : await getCurrentEvent();
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    const categories = await getCategories(event._id);
    return NextResponse.json(categories);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 },
    );
  }
}
