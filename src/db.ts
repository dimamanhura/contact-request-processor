import { MongoClient, Db, ObjectId } from "mongodb";
import { UpdateStatusParams } from "./types";

let cachedDb: Db | null = null;

export async function connectToDatabase(uri: string): Promise<Db> {
  if (cachedDb) {
    return cachedDb;
  }

  const client = new MongoClient(uri);

  await client.connect();

  cachedDb = client.db();

  return cachedDb;
}

export async function updateContactRequestStatus(
  { id, status, reason }: UpdateStatusParams,
  uri: string
): Promise<void> {
  if (!ObjectId.isValid(id)) {
    console.warn(`Invalid ID format received: ${id}`);
    return;
  }

  try {
    const db = await connectToDatabase(uri);

    const updateResult = await db
      .collection("ContactRequest")
      .updateOne(
        { _id: ObjectId.createFromHexString(id) },
        { $set: { status, reason } }
      );

    if (updateResult.matchedCount === 0) {
      console.warn(
        "Could not find matching record in DB to update. Was it saved by Next.js?"
      );
    } else {
      console.log("Successfully updated existing record with AI status.");
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Database update failed:", errorMessage);
    throw new Error(`DB Update Error: ${errorMessage}`);
  }
}
