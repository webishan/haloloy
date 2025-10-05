import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Validate DATABASE_URL is provided
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required. Please set it in your .env file.");
}

// Create Neon DB connection
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool, schema });

console.log("✅ Connected to Neon Database");

export { pool, db };
