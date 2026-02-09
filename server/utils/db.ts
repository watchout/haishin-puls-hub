import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../database/schema';

const connectionString = useRuntimeConfig().databaseUrl;

const client = postgres(connectionString);

export const db = drizzle(client, { schema });
