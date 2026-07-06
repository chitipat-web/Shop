export type Person = { id: number; name: string };
export type Store = { id: number; name: string; has_receipt: number };
export type Purchase = {
  id: number;
  date: string; // YYYY-MM-DD
  store_id: number;
  payer_id: number;
  amount_satang: number;
  note: string | null;
  receipt_url: string | null;
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
export type PurchaseRow = Purchase & {
  store_name: string;
  store_has_receipt: number;
  payer_name: string;
};
export type Summary = {
  total: number;
  paid1: number;
  paid2: number;
  /** > 0: person 2 owes person 1; < 0: person 1 owes person 2 */
  net1: number;
  count: number;
};

export interface Db {
  getPersons(): Promise<Person[]>;
  getStores(): Promise<Store[]>;
  getUnsettledPurchases(): Promise<PurchaseRow[]>;
  getUnsettledSummary(): Promise<Summary>;
  getSettlements(): Promise<Settlement[]>;
  insertPurchase(
    date: string,
    storeId: number,
    payerId: number,
    amountSatang: number,
    note: string | null,
    receiptUrl: string | null
  ): Promise<void>;
  /** Delete an unsettled purchase; when restrictToPayerId is set, only rows paid by that person. */
  deleteUnsettledPurchase(id: number, restrictToPayerId?: number): Promise<void>;
  /** Settle every unsettled purchase; no-op when there are none. */
  settleAll(label: string, settledAt: string): Promise<void>;
  updatePersonName(id: number, name: string): Promise<void>;
  updateStore(id: number, name: string, hasReceipt: number): Promise<void>;
  insertStore(name: string, hasReceipt: number): Promise<void>;
}

export function toSummary(row: {
  count: number;
  total: number;
  paid1: number;
  paid2: number;
}): Summary {
  return { ...row, net1: Math.round((row.paid1 - row.paid2) / 2) };
}

// Postgres (Neon) in production, SQLite for local dev.
const globalForDb = globalThis as unknown as { __shopDbP?: Promise<Db> };

export function getDb(): Promise<Db> {
  if (!globalForDb.__shopDbP) {
    globalForDb.__shopDbP = process.env.DATABASE_URL
      ? import("./db-postgres").then((m) => m.createPostgresDb())
      : import("./db-sqlite").then((m) => m.createSqliteDb());
  }
  return globalForDb.__shopDbP;
}
