import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";



export const pool = new Pool({ connectionString: "postgresql://postgres:Cbi2009$@82.180.147.48:5432/empdubtap" });
export const db = drizzle(pool, { schema });
