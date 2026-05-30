import { MongoClient, Db } from 'mongodb';

if (!process.env.MONGODB_URL) {
  throw new Error('Please add your MONGODB_URL to .env');
}

const uri = process.env.MONGODB_URL;
const dbName = process.env.DATABASE_NAME || 'sonic_ai_db';

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  // Set the connection options
  const client = new MongoClient(uri);

  await client.connect();
  const db = client.db(dbName);

  cachedClient = client;
  cachedDb = db;

  return { client, db };
}
