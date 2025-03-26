
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../shared/schema';

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { schema });

async function viewTables() {
  console.log("Users:");
  console.log(await db.select().from(schema.users));
  
  console.log("\nCalDAV Servers:");
  console.log(await db.select().from(schema.caldavServers));
  
  console.log("\nCalendars:");
  console.log(await db.select().from(schema.calendars));
  
  console.log("\nEvents:");
  console.log(await db.select().from(schema.events));
  
  await pool.end();
}

viewTables().catch(console.error);
