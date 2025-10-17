// Temporary mock API for categories
import { NextResponse } from "next/server";
import { getCategories } from "@/util/get-categories";

export async function GET() {
  try {
    const categories = await getCategories();
    return NextResponse.json(categories);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 },
    );
  }
}
