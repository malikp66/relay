import "server-only";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "./schema";

export type DB = PgliteDatabase<typeof schema>;

// Demo: Postgres tertanam (PGlite) di .data/pglite. Production: ganti ke Neon lewat DATABASE_URL.
const g = globalThis as unknown as { __relayDb?: Promise<DB> };

async function init(): Promise<DB> {
  const dataDir = process.env.PGLITE_DIR ?? path.join(process.cwd(), ".data", "pglite");
  await mkdir(dataDir, { recursive: true });
  const client = new PGlite(dataDir);
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  const { seedIfEmpty } = await import("./seed");
  await seedIfEmpty(db);
  return db;
}

export function getDb(): Promise<DB> {
  g.__relayDb ??= init().catch((err) => {
    g.__relayDb = undefined;
    throw err;
  });
  return g.__relayDb;
}

export { schema };
