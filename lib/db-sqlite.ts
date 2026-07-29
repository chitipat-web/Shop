import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
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

export function createSqliteDb(): Db {
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
      share_p1_satang INTEGER,
      share_p2_satang INTEGER,
      total_satang INTEGER NOT NULL,
      settled_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      store_id INTEGER NOT NULL REFERENCES stores(id),
      payer_id INTEGER NOT NULL REFERENCES persons(id),
      amount_satang INTEGER NOT NULL,
      personal_p1_satang INTEGER NOT NULL DEFAULT 0,
      personal_p2_satang INTEGER NOT NULL DEFAULT 0,
      note TEXT,
      receipt_url TEXT,
      settlement_id INTEGER REFERENCES settlements(id)
    );
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      at TEXT NOT NULL,
      actor_id INTEGER NOT NULL REFERENCES persons(id),
      action TEXT NOT NULL,
      purchase_id INTEGER NOT NULL,
      before_json TEXT NOT NULL,
      after_json TEXT
    );
  `);

  // Migrations for databases created by earlier versions of the app.
  const purchaseCols = db.prepare("PRAGMA table_info(purchases)").all() as {
    name: string;
  }[];
  if (!purchaseCols.some((c) => c.name === "receipt_url")) {
    db.exec("ALTER TABLE purchases ADD COLUMN receipt_url TEXT");
  }
  for (const col of ["personal_p1_satang", "personal_p2_satang"]) {
    if (!purchaseCols.some((c) => c.name === col)) {
      db.exec(
        `ALTER TABLE purchases ADD COLUMN ${col} INTEGER NOT NULL DEFAULT 0`
      );
    }
  }
  const settlementCols = db.prepare("PRAGMA table_info(settlements)").all() as {
    name: string;
  }[];
  for (const col of ["share_p1_satang", "share_p2_satang"]) {
    if (!settlementCols.some((c) => c.name === col)) {
      db.exec(`ALTER TABLE settlements ADD COLUMN ${col} INTEGER`);
    }
  }

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

  const api: Db = {
    async getPersons() {
      return db.prepare("SELECT * FROM persons ORDER BY id").all() as Person[];
    },
    async getStores() {
      return db.prepare("SELECT * FROM stores ORDER BY id").all() as Store[];
    },
    async getUnsettledPurchases() {
      return db
        .prepare(
          `SELECT p.*, s.name AS store_name, s.has_receipt AS store_has_receipt, per.name AS payer_name
           FROM purchases p
           JOIN stores s ON s.id = p.store_id
           JOIN persons per ON per.id = p.payer_id
           WHERE p.settlement_id IS NULL
           ORDER BY p.date DESC, p.id DESC`
        )
        .all() as PurchaseRow[];
    },
    async getUnsettledPurchase(id) {
      const row = db
        .prepare(
          `SELECT p.*, s.name AS store_name, s.has_receipt AS store_has_receipt, per.name AS payer_name
           FROM purchases p
           JOIN stores s ON s.id = p.store_id
           JOIN persons per ON per.id = p.payer_id
           WHERE p.id = ? AND p.settlement_id IS NULL`
        )
        .get(id) as PurchaseRow | undefined;
      return row ?? null;
    },
    async getUnsettledSummary() {
      const row = db
        .prepare(
          `SELECT
             COUNT(*) AS count,
             COALESCE(SUM(amount_satang), 0) AS total,
             COALESCE(SUM(CASE WHEN payer_id = 1 THEN amount_satang END), 0) AS paid1,
             COALESCE(SUM(CASE WHEN payer_id = 2 THEN amount_satang END), 0) AS paid2,
             COALESCE(SUM(personal_p1_satang), 0) AS personal1,
             COALESCE(SUM(personal_p2_satang), 0) AS personal2
           FROM purchases WHERE settlement_id IS NULL`
        )
        .get() as {
        count: number;
        total: number;
        paid1: number;
        paid2: number;
        personal1: number;
        personal2: number;
      };
      return toSummary(row);
    },
    async getSettlements() {
      return db
        .prepare("SELECT * FROM settlements ORDER BY id DESC")
        .all() as Settlement[];
    },
    async getAllPurchasesForExport() {
      return db
        .prepare(
          `SELECT p.*, s.name AS store_name, s.has_receipt AS store_has_receipt,
                  per.name AS payer_name, st.label AS settlement_label
           FROM purchases p
           JOIN stores s ON s.id = p.store_id
           JOIN persons per ON per.id = p.payer_id
           LEFT JOIN settlements st ON st.id = p.settlement_id
           ORDER BY p.date DESC, p.id DESC`
        )
        .all() as ExportRow[];
    },
    async insertPurchase(input, receiptUrl) {
      db.prepare(
        `INSERT INTO purchases
           (date, store_id, payer_id, amount_satang,
            personal_p1_satang, personal_p2_satang, note, receipt_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        input.date,
        input.storeId,
        input.payerId,
        input.amountSatang,
        input.personalP1Satang,
        input.personalP2Satang,
        input.note,
        receiptUrl
      );
    },
    async updateUnsettledPurchase(id, input, receiptUrl, restrictToPayerId) {
      const receiptSql =
        receiptUrl === undefined ? "" : ", receipt_url = @receiptUrl";
      const guardSql =
        restrictToPayerId === undefined ? "" : " AND payer_id = @restrict";
      const result = db.prepare(
        `UPDATE purchases SET
           date = @date, store_id = @storeId, payer_id = @payerId,
           amount_satang = @amountSatang,
           personal_p1_satang = @personalP1, personal_p2_satang = @personalP2,
           note = @note${receiptSql}
         WHERE id = @id AND settlement_id IS NULL${guardSql}`
      ).run({
        id,
        date: input.date,
        storeId: input.storeId,
        payerId: input.payerId,
        amountSatang: input.amountSatang,
        personalP1: input.personalP1Satang,
        personalP2: input.personalP2Satang,
        note: input.note,
        ...(receiptUrl !== undefined && { receiptUrl }),
        ...(restrictToPayerId !== undefined && { restrict: restrictToPayerId }),
      });
      return result.changes > 0;
    },
    async deleteUnsettledPurchase(id, restrictToPayerId) {
      const result =
        restrictToPayerId !== undefined
          ? db
              .prepare(
                "DELETE FROM purchases WHERE id = ? AND settlement_id IS NULL AND payer_id = ?"
              )
              .run(id, restrictToPayerId)
          : db
              .prepare(
                "DELETE FROM purchases WHERE id = ? AND settlement_id IS NULL"
              )
              .run(id);
      return result.changes > 0;
    },
    async settleAll(label, settledAt) {
      // Stamp exactly the rows that were counted, so a purchase inserted
      // mid-settle falls through to the next round instead of being locked
      // into a settlement whose totals never saw it.
      const settle = db.transaction(() => {
        const rows = db
          .prepare(
            `SELECT id, payer_id, amount_satang, personal_p1_satang, personal_p2_satang
             FROM purchases WHERE settlement_id IS NULL`
          )
          .all() as {
          id: number;
          payer_id: number;
          amount_satang: number;
          personal_p1_satang: number;
          personal_p2_satang: number;
        }[];
        if (rows.length === 0) return;
        const summary = toSummary({
          count: rows.length,
          total: rows.reduce((t, r) => t + r.amount_satang, 0),
          paid1: rows
            .filter((r) => r.payer_id === 1)
            .reduce((t, r) => t + r.amount_satang, 0),
          paid2: rows
            .filter((r) => r.payer_id === 2)
            .reduce((t, r) => t + r.amount_satang, 0),
          personal1: rows.reduce((t, r) => t + r.personal_p1_satang, 0),
          personal2: rows.reduce((t, r) => t + r.personal_p2_satang, 0),
        });
        const result = db
          .prepare(
            `INSERT INTO settlements
               (label, from_person, to_person, amount_satang,
                paid_p1_satang, paid_p2_satang, share_p1_satang, share_p2_satang,
                total_satang, settled_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            label,
            summary.net1 >= 0 ? 2 : 1,
            summary.net1 >= 0 ? 1 : 2,
            Math.abs(summary.net1),
            summary.paid1,
            summary.paid2,
            summary.share1,
            summary.share2,
            summary.total,
            settledAt
          );
        db.prepare(
          `UPDATE purchases SET settlement_id = ?
           WHERE settlement_id IS NULL AND id IN (${rows.map(() => "?").join(",")})`
        ).run(result.lastInsertRowid, ...rows.map((r) => r.id));
      });
      settle();
    },
    async insertAudit(at, actorId, action, purchaseId, beforeJson, afterJson) {
      db.prepare(
        `INSERT INTO audit_log (at, actor_id, action, purchase_id, before_json, after_json)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(at, actorId, action, purchaseId, beforeJson, afterJson);
    },
    async getAuditLog(limit) {
      return db
        .prepare(
          `SELECT a.*, per.name AS actor_name
           FROM audit_log a
           JOIN persons per ON per.id = a.actor_id
           ORDER BY a.id DESC LIMIT ?`
        )
        .all(limit) as AuditRow[];
    },
    async updatePersonName(id, name) {
      db.prepare("UPDATE persons SET name = ? WHERE id = ?").run(name, id);
    },
    async updateStore(id, name, hasReceipt) {
      db.prepare(
        "UPDATE stores SET name = ?, has_receipt = ? WHERE id = ?"
      ).run(name, hasReceipt, id);
    },
    async insertStore(name, hasReceipt) {
      db.prepare("INSERT INTO stores (name, has_receipt) VALUES (?, ?)").run(
        name,
        hasReceipt
      );
    },
  };
  return api;
}
