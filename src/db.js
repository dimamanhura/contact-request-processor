const { MongoClient } = require("mongodb");

let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) {
    return cachedDb;
  }

  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI environment variable is missing.");
  }

  const client = new MongoClient(uri);

  await client.connect();

  cachedDb = client.db();

  return cachedDb;
}

module.exports = { connectToDatabase };
