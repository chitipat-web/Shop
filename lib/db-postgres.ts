import { neon } from "@neondatabase/serverless";
import {
  type Db,
  type Person,
  type PurchaseRow,
  type Settlement,
  type Store,
  toSummary,
} from "./db";

export async function createPostgresDb(): Promise<Db> {
  const sql = neon(process.env.DATABASE_URL!);

  await sql`
    CREATE TABLE IF NOT EXISTS persons (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS stores (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      has_receipt INTEGER NOT NULL DEFAULT 0
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS settlements (
      id SERIAL PRIMARY KEY,
      label TEXT NOT NULL,
      from_person INTEGER NOT NULL REFERENCES persons(id),
      to_person INTEGER NOT NULL REFERENCES persons(id),
      amount_satang INTEGER NOT NULL,
      paid_p1_satang INTEGER NOT NULL,
      paid_p2_satang INTEGER NOT NULL,
      total_satang INTEGER NOT NULL,
      settled_at TEXT NOT NULL
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS purchases (
      id SERIAL PRIMARY KEY,
      date TEXT NOT NULL,
      store_id INTEGER NOT NULL REFERENCES stores(id),
      payer_id INTEGER NOT NULL REFERENCES persons(id),
      amount_satang INTEGER NOT NULL,
      note TEXT,
      settlement_id INTEGER REFERENCES settlements(id)
    )`;

  const [{ c: personCount }] =
    (await sql`SELECT COUNT(*)::int AS c FROM persons`) as { c: number }[];
  if (personCount === 0) {
    await sql`INSERT INTO persons (id, name) VALUES (1, 'คนที่ 1'), (2, 'คนที่ 2')`;
  }
  const [{ c: storeCount }] =
    (await sql`SELECT COUNT(*)::int AS c FROM stores`) as { c: number }[];
  if (storeCount === 0) {
    await sql`INSERT INTO stores (name, has_receipt) VALUES ('ร้าน A', 1), ('ร้าน B', 0)`;
  }

  const db: Db = {
    async getPersons() {
      return (await sql`SELECT * FROM persons ORDER BY id`) as Person[];
    },
    async getStores() {
      return (await sql`SELECT * FROM stores ORDER BY id`) as Store[];
    },
    async getUnsettledPurchases() {
      return (await sql`
        SELECT p.*, s.name AS store_name, s.has_receipt AS store_has_receipt, per.name AS payer_name
        FROM purchases p
        JOIN stores s ON s.id = p.store_id
        JOIN persons per ON per.id = p.payer_id
        WHERE p.settlement_id IS NULL
        ORDER BY p.date DESC, p.id DESC`) as PurchaseRow[];
    },
    async getUnsettledSummary() {
      const [row] = (await sql`
        SELECT
          COUNT(*)::int AS count,
          COALESCE(SUM(amount_satang), 0)::int AS total,
          COALESCE(SUM(CASE WHEN payer_id = 1 THEN amount_satang END), 0)::int AS paid1,
          COALESCE(SUM(CASE WHEN payer_id = 2 THEN amount_satang END), 0)::int AS paid2
        FROM purchases WHERE settlement_id IS NULL`) as {
        count: number;
        total: number;
        paid1: number;
        paid2: number;
      }[];
      return toSummary(row);
    },
    async getSettlements() {
      return (await sql`SELECT * FROM settlements ORDER BY id DESC`) as Settlement[];
    },
    async insertPurchase(date, storeId, payerId, amountSatang, note) {
      await sql`
        INSERT INTO purchases (date, store_id, payer_id, amount_satang, note)
        VALUES (${date}, ${storeId}, ${payerId}, ${amountSatang}, ${note})`;
    },
    async deleteUnsettledPurchase(id, restrictToPayerId) {
      if (restrictToPayerId !== undefined) {
        await sql`DELETE FROM purchases WHERE id = ${id} AND settlement_id IS NULL AND payer_id = ${restrictToPayerId}`;
      } else {
        await sql`DELETE FROM purchases WHERE id = ${id} AND settlement_id IS NULL`;
      }
    },
    async settleAll(label, settledAt) {
      const summary = await db.getUnsettledSummary();
      if (summary.count === 0) return;
      const [{ id }] = (await sql`
        INSERT INTO settlements
          (label, from_person, to_person, amount_satang,
           paid_p1_satang, paid_p2_satang, total_satang, settled_at)
        VALUES
          (${label}, ${summary.net1 >= 0 ? 2 : 1}, ${summary.net1 >= 0 ? 1 : 2},
           ${Math.abs(summary.net1)}, ${summary.paid1}, ${summary.paid2},
           ${summary.total}, ${settledAt})
        RETURNING id`) as { id: number }[];
      await sql`UPDATE purchases SET settlement_id = ${id} WHERE settlement_id IS NULL`;
    },
    async updatePersonName(id, name) {
      await sql`UPDATE persons SET name = ${name} WHERE id = ${id}`;
    },
    async updateStore(id, name, hasReceipt) {
      await sql`UPDATE stores SET name = ${name}, has_receipt = ${hasReceipt} WHERE id = ${id}`;
    },
    async insertStore(name, hasReceipt) {
      await sql`INSERT INTO stores (name, has_receipt) VALUES (${name}, ${hasReceipt})`;
    },
  };
  return db;
}
