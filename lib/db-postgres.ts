import { neon } from "@neondatabase/serverless";
import {
  type AuditRow,
  type Db,
  type ExportRow,
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
      share_p1_satang INTEGER,
      share_p2_satang INTEGER,
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
      personal_p1_satang INTEGER NOT NULL DEFAULT 0,
      personal_p2_satang INTEGER NOT NULL DEFAULT 0,
      note TEXT,
      receipt_url TEXT,
      settlement_id INTEGER REFERENCES settlements(id)
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS audit_log (
      id SERIAL PRIMARY KEY,
      at TEXT NOT NULL,
      actor_id INTEGER NOT NULL REFERENCES persons(id),
      action TEXT NOT NULL,
      purchase_id INTEGER NOT NULL,
      before_json TEXT NOT NULL,
      after_json TEXT
    )`;
  // Migrations for databases created by earlier versions of the app.
  await sql`ALTER TABLE purchases ADD COLUMN IF NOT EXISTS receipt_url TEXT`;
  await sql`ALTER TABLE purchases ADD COLUMN IF NOT EXISTS personal_p1_satang INTEGER NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE purchases ADD COLUMN IF NOT EXISTS personal_p2_satang INTEGER NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE settlements ADD COLUMN IF NOT EXISTS share_p1_satang INTEGER`;
  await sql`ALTER TABLE settlements ADD COLUMN IF NOT EXISTS share_p2_satang INTEGER`;

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
    async getUnsettledPurchase(id) {
      const rows = (await sql`
        SELECT p.*, s.name AS store_name, s.has_receipt AS store_has_receipt, per.name AS payer_name
        FROM purchases p
        JOIN stores s ON s.id = p.store_id
        JOIN persons per ON per.id = p.payer_id
        WHERE p.id = ${id} AND p.settlement_id IS NULL`) as PurchaseRow[];
      return rows[0] ?? null;
    },
    async getUnsettledSummary() {
      const [row] = (await sql`
        SELECT
          COUNT(*)::int AS count,
          COALESCE(SUM(amount_satang), 0)::int AS total,
          COALESCE(SUM(CASE WHEN payer_id = 1 THEN amount_satang END), 0)::int AS paid1,
          COALESCE(SUM(CASE WHEN payer_id = 2 THEN amount_satang END), 0)::int AS paid2,
          COALESCE(SUM(personal_p1_satang), 0)::int AS personal1,
          COALESCE(SUM(personal_p2_satang), 0)::int AS personal2
        FROM purchases WHERE settlement_id IS NULL`) as {
        count: number;
        total: number;
        paid1: number;
        paid2: number;
        personal1: number;
        personal2: number;
      }[];
      return toSummary(row);
    },
    async getSettlements() {
      return (await sql`SELECT * FROM settlements ORDER BY id DESC`) as Settlement[];
    },
    async getAllPurchasesForExport() {
      return (await sql`
        SELECT p.*, s.name AS store_name, s.has_receipt AS store_has_receipt,
               per.name AS payer_name, st.label AS settlement_label
        FROM purchases p
        JOIN stores s ON s.id = p.store_id
        JOIN persons per ON per.id = p.payer_id
        LEFT JOIN settlements st ON st.id = p.settlement_id
        ORDER BY p.date DESC, p.id DESC`) as ExportRow[];
    },
    async insertPurchase(input, receiptUrl) {
      await sql`
        INSERT INTO purchases
          (date, store_id, payer_id, amount_satang,
           personal_p1_satang, personal_p2_satang, note, receipt_url)
        VALUES (${input.date}, ${input.storeId}, ${input.payerId}, ${input.amountSatang},
                ${input.personalP1Satang}, ${input.personalP2Satang}, ${input.note}, ${receiptUrl})`;
    },
    async updateUnsettledPurchase(id, input, receiptUrl, restrictToPayerId) {
      // COALESCE-style keep for the photo: when receiptUrl is undefined the
      // column keeps its current value.
      const keepPhoto = receiptUrl === undefined;
      const rows = (await sql`
        UPDATE purchases SET
          date = ${input.date}, store_id = ${input.storeId}, payer_id = ${input.payerId},
          amount_satang = ${input.amountSatang},
          personal_p1_satang = ${input.personalP1Satang},
          personal_p2_satang = ${input.personalP2Satang},
          note = ${input.note},
          receipt_url = CASE WHEN ${keepPhoto} THEN receipt_url ELSE ${receiptUrl ?? null} END
        WHERE id = ${id} AND settlement_id IS NULL
          AND (${restrictToPayerId === undefined} OR payer_id = ${restrictToPayerId ?? null})
        RETURNING id`) as { id: number }[];
      return rows.length > 0;
    },
    async deleteUnsettledPurchase(id, restrictToPayerId) {
      const rows = (
        restrictToPayerId !== undefined
          ? await sql`DELETE FROM purchases WHERE id = ${id} AND settlement_id IS NULL AND payer_id = ${restrictToPayerId} RETURNING id`
          : await sql`DELETE FROM purchases WHERE id = ${id} AND settlement_id IS NULL RETURNING id`
      ) as { id: number }[];
      return rows.length > 0;
    },
    async settleAll(label, settledAt) {
      // One statement = one transaction on the Neon HTTP driver (separate
      // sql`` calls each autocommit, so a multi-call version could record a
      // settlement and crash before stamping, double-counting next round).
      // FOR UPDATE locks the counted rows, so a concurrent edit/delete
      // waits until they are stamped and then no-ops on its
      // settlement_id IS NULL guard. Share math mirrors toSummary():
      // shared is non-negative, so integer division == Math.floor.
      await sql`
        WITH counted AS (
          SELECT id, payer_id, amount_satang, personal_p1_satang, personal_p2_satang
          FROM purchases
          WHERE settlement_id IS NULL
          FOR UPDATE
        ),
        math AS (
          SELECT
            COUNT(*)::int AS count,
            COALESCE(SUM(amount_satang), 0)::int AS total,
            COALESCE(SUM(amount_satang) FILTER (WHERE payer_id = 1), 0)::int AS paid1,
            COALESCE(SUM(amount_satang) FILTER (WHERE payer_id = 2), 0)::int AS paid2,
            (COALESCE(SUM(personal_p1_satang), 0)
              + (COALESCE(SUM(amount_satang), 0)
                 - COALESCE(SUM(personal_p1_satang), 0)
                 - COALESCE(SUM(personal_p2_satang), 0)) / 2)::int AS share1
          FROM counted
        ),
        ins AS (
          INSERT INTO settlements
            (label, from_person, to_person, amount_satang,
             paid_p1_satang, paid_p2_satang, share_p1_satang, share_p2_satang,
             total_satang, settled_at)
          SELECT ${label},
                 CASE WHEN paid1 - share1 >= 0 THEN 2 ELSE 1 END,
                 CASE WHEN paid1 - share1 >= 0 THEN 1 ELSE 2 END,
                 ABS(paid1 - share1),
                 paid1, paid2, share1, total - share1, total, ${settledAt}
          FROM math WHERE count > 0
          RETURNING id
        )
        UPDATE purchases SET settlement_id = (SELECT id FROM ins)
        WHERE settlement_id IS NULL
          AND id IN (SELECT id FROM counted)
          AND EXISTS (SELECT 1 FROM ins)`;
    },
    async insertAudit(at, actorId, action, purchaseId, beforeJson, afterJson) {
      await sql`
        INSERT INTO audit_log (at, actor_id, action, purchase_id, before_json, after_json)
        VALUES (${at}, ${actorId}, ${action}, ${purchaseId}, ${beforeJson}, ${afterJson})`;
    },
    async getAuditLog(limit) {
      return (await sql`
        SELECT a.*, per.name AS actor_name
        FROM audit_log a
        JOIN persons per ON per.id = a.actor_id
        ORDER BY a.id DESC LIMIT ${limit}`) as AuditRow[];
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
