import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

export type Person = { id: number; name: string };
export type Store = { id: number; name: string; has_receipt: number };
export type Purchase = {
  id: number;
  date: string; // YYYY-MM-DD
  store_id: number;
  payer_id: number;
  amount_satang: number;
  note: string | null;
  settlement_id: number | null;
};
export type Settlement = {
  id: number;
  label: string; // YYYY-MM
  from_person: number;
  to_person: number;
  amount_satang: number;
  paid_p1_satang: number;
  paid_p2_satang: number;
  total_satang: number;
  settled_at: string;
};

function createDb(): Database.Database {
  // Vercel's filesystem is read-only except /tmp, so demo deployments keep
  // the DB there (data resets when the serverless instance recycles).
  const dir = process.env.VERCEL
    ? "/tmp/shop-data"
    : path.join(process.cwd(), "data");
  fs.mkdirSync(dir, { recursive: true });
  const db = new Database(path.join(dir, "shop.db"));
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS persons (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS stores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      has_receipt INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS settlements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      label TEXT NOT NULL,
      from_person INTEGER NOT NULL REFERENCES persons(id),
      to_person INTEGER NOT NULL REFERENCES persons(id),
      amount_satang INTEGER NOT NULL,
      paid_p1_satang INTEGER NOT NULL,
      paid_p2_satang INTEGER NOT NULL,
      total_satang INTEGER NOT NULL,
      settled_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      store_id INTEGER NOT NULL REFERENCES stores(id),
      payer_id INTEGER NOT NULL REFERENCES persons(id),
      amount_satang INTEGER NOT NULL,
      note TEXT,
      settlement_id INTEGER REFERENCES settlements(id)
    );
  `);

  const personCount = db
    .prepare("SELECT COUNT(*) AS c FROM persons")
    .get() as { c: number };
  if (personCount.c === 0) {
    const insert = db.prepare("INSERT INTO persons (id, name) VALUES (?, ?)");
    insert.run(1, "คนที่ 1");
    insert.run(2, "คนที่ 2");
  }

  const storeCount = db.prepare("SELECT COUNT(*) AS c FROM stores").get() as {
    c: number;
  };
  if (storeCount.c === 0) {
    const insert = db.prepare(
      "INSERT INTO stores (name, has_receipt) VALUES (?, ?)"
    );
    insert.run("ร้าน A", 1);
    insert.run("ร้าน B", 0);
  }

  return db;
}

// Reuse the connection across dev-server hot reloads.
const globalForDb = globalThis as unknown as { __shopDb?: Database.Database };

export function getDb(): Database.Database {
  if (!globalForDb.__shopDb) {
    globalForDb.__shopDb = createDb();
  }
  return globalForDb.__shopDb;
}

export function getPersons(): Person[] {
  return getDb().prepare("SELECT * FROM persons ORDER BY id").all() as Person[];
}

export function getStores(): Store[] {
  return getDb().prepare("SELECT * FROM stores ORDER BY id").all() as Store[];
}

export type PurchaseRow = Purchase & { store_name: string; payer_name: string };

export function getUnsettledPurchases(): PurchaseRow[] {
  return getDb()
    .prepare(
      `SELECT p.*, s.name AS store_name, per.name AS payer_name
       FROM purchases p
       JOIN stores s ON s.id = p.store_id
       JOIN persons per ON per.id = p.payer_id
       WHERE p.settlement_id IS NULL
       ORDER BY p.date DESC, p.id DESC`
    )
    .all() as PurchaseRow[];
}

export type Summary = {
  total: number;
  paid1: number;
  paid2: number;
  /** > 0: person 2 owes person 1; < 0: person 1 owes person 2 */
  net1: number;
  count: number;
};

export function getUnsettledSummary(): Summary {
  const row = getDb()
    .prepare(
      `SELECT
         COUNT(*) AS count,
         COALESCE(SUM(amount_satang), 0) AS total,
         COALESCE(SUM(CASE WHEN payer_id = 1 THEN amount_satang END), 0) AS paid1,
         COALESCE(SUM(CASE WHEN payer_id = 2 THEN amount_satang END), 0) AS paid2
       FROM purchases WHERE settlement_id IS NULL`
    )
    .get() as { count: number; total: number; paid1: number; paid2: number };
  return {
    ...row,
    net1: Math.round((row.paid1 - row.paid2) / 2),
  };
}

export function getSettlements(): Settlement[] {
  return getDb()
    .prepare("SELECT * FROM settlements ORDER BY id DESC")
    .all() as Settlement[];
}
