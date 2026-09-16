import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";

type CategoryDocument = Omit<Category, "_id" | "eventId"> & {
  _id: ObjectId;
  eventId: ObjectId;
};

function serializeCategory(category: CategoryDocument): Category {
  return {
    _id: category._id.toString(),
    eventId: category.eventId.toString(),
    title: category.title ?? "",
    icon: category.icon ?? "",
    order: category.order ?? 0,
    eligibility: category.eligibility ?? "all",
  };
}

export async function getCategories(eventId: string): Promise<Category[]> {
  const db = await getDb();
  const categories = await db
    .collection<CategoryDocument>("categories")
    .find({ eventId: new ObjectId(eventId) })
    .sort({ order: 1 })
    .toArray();
  return categories.map(serializeCategory);
}

export async function getCategoryById(id: string): Promise<Category | null> {
  if (!ObjectId.isValid(id)) return null;
  const db = await getDb();
  const category = await db
    .collection<CategoryDocument>("categories")
    .findOne({ _id: new ObjectId(id) });
  return category ? serializeCategory(category) : null;
}
