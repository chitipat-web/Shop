export type Person = { id: number; name: string };
export type Store = { id: number; name: string; has_receipt: number };
export type Purchase = {
  id: number;
  date: string; // YYYY-MM-DD
  store_id: number;
  payer_id: number;
  amount_satang: number;
  /** Portion of amount_satang that is person 1's personal (not split) spend. */
  personal_p1_satang: number;
  /** Portion of amount_satang that is person 2's personal (not split) spend. */
  personal_p2_satang: number;
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
  /** Null on settlements recorded before personal items existed (was total/2 each). */
  share_p1_satang: number | null;
  share_p2_satang: number | null;
  total_satang: number;
  settled_at: string;
};
export type PurchaseRow = Purchase & {
  store_name: string;
  store_has_receipt: number;
  payer_name: string;
};
export type ExportRow = PurchaseRow & { settlement_label: string | null };
export type PurchaseInput = {
  date: string;
  storeId: number;
  payerId: number;
  amountSatang: number;
  personalP1Satang: number;
  personalP2Satang: number;
  note: string | null;
};
/** What a purchase looked like at audit time (column-name keys, JSON-stored). */
export type AuditSnapshot = {
  date: string;
  store_id: number;
  payer_id: number;
  amount_satang: number;
  personal_p1_satang: number;
  personal_p2_satang: number;
  note: string | null;
  receipt_url: string | null;
};
export type AuditRow = {
  id: number;
  at: string; // ISO timestamp (UTC)
  actor_id: number;
  actor_name: string;
  action: "update" | "delete";
  purchase_id: number;
  before_json: string;
  after_json: string | null; // null for deletes
};
export type Summary = {
  total: number;
  paid1: number;
  paid2: number;
  personal1: number;
  personal2: number;
  /** What each person is responsible for: their personal spend + half the shared part. */
  share1: number;
  share2: number;
  /** > 0: person 2 owes person 1; < 0: person 1 owes person 2 */
  net1: number;
  count: number;
};

export interface Db {
  getPersons(): Promise<Person[]>;
  getStores(): Promise<Store[]>;
  getUnsettledPurchases(): Promise<PurchaseRow[]>;
  getUnsettledPurchase(id: number): Promise<PurchaseRow | null>;
  getUnsettledSummary(): Promise<Summary>;
  getSettlements(): Promise<Settlement[]>;
  getAllPurchasesForExport(): Promise<ExportRow[]>;
  insertPurchase(input: PurchaseInput, receiptUrl: string | null): Promise<void>;
  /**
   * Update an unsettled purchase. receiptUrl: undefined = keep current photo,
   * null = remove, string = replace. When restrictToPayerId is set, only rows
   * currently paid by that person are touched. Resolves true when a row changed.
   */
  updateUnsettledPurchase(
    id: number,
    input: PurchaseInput,
    receiptUrl: string | null | undefined,
    restrictToPayerId?: number
  ): Promise<boolean>;
  /**
   * Delete an unsettled purchase; when restrictToPayerId is set, only rows
   * paid by that person. Resolves true when a row was deleted.
   */
  deleteUnsettledPurchase(
    id: number,
    restrictToPayerId?: number
  ): Promise<boolean>;
  /** Settle every unsettled purchase; no-op when there are none. */
  settleAll(label: string, settledAt: string): Promise<void>;
  insertAudit(
    at: string,
    actorId: number,
    action: "update" | "delete",
    purchaseId: number,
    beforeJson: string,
    afterJson: string | null
  ): Promise<void>;
  getAuditLog(limit: number): Promise<AuditRow[]>;
  updatePersonName(id: number, name: string): Promise<void>;
  updateStore(id: number, name: string, hasReceipt: number): Promise<void>;
  insertStore(name: string, hasReceipt: number): Promise<void>;
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

export function toSummary(row: {
  count: number;
  total: number;
  paid1: number;
  paid2: number;
  personal1: number;
  personal2: number;
}): Summary {
  const shared = row.total - row.personal1 - row.personal2;
  // On an odd satang the extra goes to person 2; share1 + share2 === total always.
  const share1 = row.personal1 + Math.floor(shared / 2);
  const share2 = row.total - share1;
  return { ...row, share1, share2, net1: row.paid1 - share1 };
}
