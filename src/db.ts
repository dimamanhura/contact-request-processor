import { MongoClient, Db, ObjectId } from "mongodb";
import { UpdateClassificationParams } from "./types";
import { logger } from "./logger";

let cachedDb: Db | null = null;

export const _resetCache = () => {
  cachedDb = null;
};

export async function connectToDatabase(uri: string): Promise<Db> {
  if (cachedDb) {
    return cachedDb;
  }

  const client = new MongoClient(uri);

  await client.connect();

  cachedDb = client.db();

  return cachedDb;
}

export async function updateContactRequestClassification(
  { id, classification, reason }: UpdateClassificationParams,
  uri: string
): Promise<{ success: boolean; errorMessage?: string }> {
  if (!ObjectId.isValid(id)) {
    logger.warn("Invalid ID format received", { receivedId: id });
    return {
      success: false,
      errorMessage: `Invalid ID format received: ${id}`,
    };
  }

  try {
    const db = await connectToDatabase(uri);

    const updateResult = await db
      .collection("ContactRequest")
      .updateOne(
        { _id: ObjectId.createFromHexString(id) },
        { $set: { classification, reason } }
      );

    if (updateResult.matchedCount === 0) {
      logger.warn(
        "Could not find matching record in DB to update. Was it saved by Next.js?",
        { documentId: id }
      );
    } else {
      logger.debug(
        "Successfully updated existing record with AI classification."
      );
    }

    return { success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Database update failed", {
      error: error instanceof Error ? error : new Error(errorMessage),
    });

    return { success: false, errorMessage: `DB Update Error: ${errorMessage}` };
  }
}
