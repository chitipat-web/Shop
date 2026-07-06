import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import {
  type Db,
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
      receipt_url TEXT,
      settlement_id INTEGER REFERENCES settlements(id)
    );
  `);

  // Migration for databases created before slip attachments existed.
  const purchaseCols = db.prepare("PRAGMA table_info(purchases)").all() as {
    name: string;
  }[];
  if (!purchaseCols.some((c) => c.name === "receipt_url")) {
    db.exec("ALTER TABLE purchases ADD COLUMN receipt_url TEXT");
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
    async getUnsettledSummary() {
      const row = db
        .prepare(
          `SELECT
             COUNT(*) AS count,
             COALESCE(SUM(amount_satang), 0) AS total,
             COALESCE(SUM(CASE WHEN payer_id = 1 THEN amount_satang END), 0) AS paid1,
             COALESCE(SUM(CASE WHEN payer_id = 2 THEN amount_satang END), 0) AS paid2
           FROM purchases WHERE settlement_id IS NULL`
        )
        .get() as { count: number; total: number; paid1: number; paid2: number };
      return toSummary(row);
    },
    async getSettlements() {
      return db
        .prepare("SELECT * FROM settlements ORDER BY id DESC")
        .all() as Settlement[];
    },
    async insertPurchase(date, storeId, payerId, amountSatang, note, receiptUrl) {
      db.prepare(
        `INSERT INTO purchases (date, store_id, payer_id, amount_satang, note, receipt_url)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(date, storeId, payerId, amountSatang, note, receiptUrl);
    },
    async deleteUnsettledPurchase(id, restrictToPayerId) {
      if (restrictToPayerId !== undefined) {
        db.prepare(
          "DELETE FROM purchases WHERE id = ? AND settlement_id IS NULL AND payer_id = ?"
        ).run(id, restrictToPayerId);
      } else {
        db.prepare(
          "DELETE FROM purchases WHERE id = ? AND settlement_id IS NULL"
        ).run(id);
      }
    },
    async settleAll(label, settledAt) {
      const summary = await api.getUnsettledSummary();
      if (summary.count === 0) return;
      const settle = db.transaction(() => {
        const result = db
          .prepare(
            `INSERT INTO settlements
               (label, from_person, to_person, amount_satang,
                paid_p1_satang, paid_p2_satang, total_satang, settled_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            label,
            summary.net1 >= 0 ? 2 : 1,
            summary.net1 >= 0 ? 1 : 2,
            Math.abs(summary.net1),
            summary.paid1,
            summary.paid2,
            summary.total,
            settledAt
          );
        db.prepare(
          "UPDATE purchases SET settlement_id = ? WHERE settlement_id IS NULL"
        ).run(result.lastInsertRowid);
      });
      settle();
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
