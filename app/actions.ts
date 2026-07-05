"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb, getUnsettledSummary } from "@/lib/db";
import { parseBahtToSatang, todayBangkok } from "@/lib/format";

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/list");
  revalidatePath("/settle");
  revalidatePath("/settings");
}

export async function addPurchase(formData: FormData) {
  const storeId = Number(formData.get("store_id"));
  const payerId = Number(formData.get("payer_id"));
  const amount = parseBahtToSatang(String(formData.get("amount") ?? ""));
  const date = String(formData.get("date") ?? "") || todayBangkok();
  const note = String(formData.get("note") ?? "").trim();

  if (!storeId || !payerId || amount === null) {
    redirect("/?error=invalid");
  }

  getDb()
    .prepare(
      `INSERT INTO purchases (date, store_id, payer_id, amount_satang, note)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(date, storeId, payerId, amount, note || null);

  revalidateAll();
  redirect("/list?added=1");
}

export async function deletePurchase(formData: FormData) {
  const id = Number(formData.get("id"));
  // Never touch already-settled records.
  getDb()
    .prepare("DELETE FROM purchases WHERE id = ? AND settlement_id IS NULL")
    .run(id);
  revalidateAll();
}

export async function settleUp() {
  const db = getDb();
  const summary = getUnsettledSummary();
  if (summary.count === 0) return;

  const net1 = summary.net1;
  const fromPerson = net1 >= 0 ? 2 : 1;
  const toPerson = net1 >= 0 ? 1 : 2;
  const label = todayBangkok().slice(0, 7);

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
        fromPerson,
        toPerson,
        Math.abs(net1),
        summary.paid1,
        summary.paid2,
        summary.total,
        new Date().toISOString()
      );
    db.prepare(
      "UPDATE purchases SET settlement_id = ? WHERE settlement_id IS NULL"
    ).run(result.lastInsertRowid);
  });
  settle();

  revalidateAll();
  redirect("/settle?done=1");
}

export async function updatePersonNames(formData: FormData) {
  const db = getDb();
  for (const id of [1, 2]) {
    const name = String(formData.get(`person_${id}`) ?? "").trim();
    if (name) {
      db.prepare("UPDATE persons SET name = ? WHERE id = ?").run(name, id);
    }
  }
  revalidateAll();
  redirect("/settings?saved=1");
}

export async function updateStore(formData: FormData) {
  const id = Number(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  const hasReceipt = formData.get("has_receipt") === "on" ? 1 : 0;
  if (id && name) {
    getDb()
      .prepare("UPDATE stores SET name = ?, has_receipt = ? WHERE id = ?")
      .run(name, hasReceipt, id);
  }
  revalidateAll();
  redirect("/settings?saved=1");
}

export async function addStore(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const hasReceipt = formData.get("has_receipt") === "on" ? 1 : 0;
  if (name) {
    getDb()
      .prepare("INSERT INTO stores (name, has_receipt) VALUES (?, ?)")
      .run(name, hasReceipt);
  }
  revalidateAll();
  redirect("/settings?saved=1");
}
