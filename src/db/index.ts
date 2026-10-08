import "server-only";
import path from "node:path";
import { sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

/**
 * Koneksi database.
 * - Production (Vercel): Postgres sungguhan lewat DATABASE_URL (mis. Neon).
 * - Lokal / demo: PGlite (Postgres tertanam) di .data/pglite — tanpa setup apa pun.
 * Keduanya memakai skema & migrasi Drizzle yang sama.
 */
export type DB = NodePgDatabase<typeof schema>;

const g = globalThis as unknown as { __relayDb?: Promise<DB> };
const MIGRATIONS = path.join(process.cwd(), "drizzle");
const LOCK_ID = 727_001; // advisory lock: cegah migrasi/seed jalan bersamaan di beberapa instance

/**
 * `sslmode` di URL (mis. Neon: `sslmode=require`) memicu peringatan pg karena maknanya akan berubah di pg v9.
 * Kita baca sendiri lalu beri `ssl` eksplisit: sertifikat diverifikasi (sama dengan perilaku pg saat ini),
 * kecuali host lokal atau `sslmode=disable`.
 */
function pgConnection(url: string) {
  const u = new URL(url);
  const mode = u.searchParams.get("sslmode");
  u.searchParams.delete("sslmode");
  const plain = mode === "disable" || ["localhost", "127.0.0.1", "::1"].includes(u.hostname);
  return { connectionString: u.toString(), ssl: plain ? undefined : { rejectUnauthorized: true } };
}

async function initPostgres(url: string): Promise<DB> {
  const { Pool } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const { migrate } = await import("drizzle-orm/node-postgres/migrator");
  const pool = new Pool({
    ...pgConnection(url),
    max: Number(process.env.PG_POOL_MAX ?? 3),
    idleTimeoutMillis: 10_000,
  });
  const db = drizzle(pool, { schema });
  // Migrasi & seed memakai SATU koneksi yang sama dengan pemegang lock (aman walau pool kecil).
  const client = await pool.connect();
  try {
    await client.query("select pg_advisory_lock($1)", [LOCK_ID]);
    const locked = drizzle(client, { schema });
    await migrate(locked, { migrationsFolder: MIGRATIONS });
    const { seedIfEmpty } = await import("./seed");
    await seedIfEmpty(locked);
  } finally {
    await client.query("select pg_advisory_unlock($1)", [LOCK_ID]).catch(() => {});
    client.release();
  }
  return db;
}

async function initPglite(): Promise<DB> {
  const { mkdir } = await import("node:fs/promises");
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  // Di serverless tanpa DATABASE_URL, hanya /tmp yang bisa ditulis (data sementara per instance).
  const dataDir = process.env.PGLITE_DIR ?? (process.env.VERCEL ? "/tmp/relay-pglite" : path.join(process.cwd(), ".data", "pglite"));
  if (process.env.VERCEL) console.warn("[relay] DATABASE_URL belum diatur, memakai PGlite sementara di /tmp. Data & sesi bisa hilang antar instance.");
  await mkdir(dataDir, { recursive: true });
  const db = drizzle(new PGlite(dataDir), { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS });
  const { seedIfEmpty } = await import("./seed");
  await seedIfEmpty(db as unknown as DB);
  return db as unknown as DB;
}

export function getDb(): Promise<DB> {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  g.__relayDb ??= (url ? initPostgres(url) : initPglite()).catch((err) => {
    g.__relayDb = undefined;
    throw err;
  });
  return g.__relayDb;
}

/** Cek koneksi (dipakai /api/health). */
export async function pingDb() {
  const db = await getDb();
  await db.execute(sql`select 1`);
  return process.env.DATABASE_URL || process.env.POSTGRES_URL ? "postgres" : "pglite";
}

export { schema };
