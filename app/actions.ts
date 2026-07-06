"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
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

  const db = await getDb();
  await db.insertPurchase(date, storeId, payerId, amount, note || null);

  revalidateAll();
  redirect("/list?added=1");
}

export async function deletePurchase(formData: FormData) {
  const id = Number(formData.get("id"));
  const db = await getDb();
  // Never touch already-settled records.
  await db.deleteUnsettledPurchase(id);
  revalidateAll();
}

export async function settleUp() {
  const db = await getDb();
  await db.settleAll(todayBangkok().slice(0, 7), new Date().toISOString());
  revalidateAll();
  redirect("/settle?done=1");
}

export async function updatePersonNames(formData: FormData) {
  const db = await getDb();
  for (const id of [1, 2]) {
    const name = String(formData.get(`person_${id}`) ?? "").trim();
    if (name) {
      await db.updatePersonName(id, name);
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
    const db = await getDb();
    await db.updateStore(id, name, hasReceipt);
  }
  revalidateAll();
  redirect("/settings?saved=1");
}

export async function addStore(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const hasReceipt = formData.get("has_receipt") === "on" ? 1 : 0;
  if (name) {
    const db = await getDb();
    await db.insertStore(name, hasReceipt);
  }
  revalidateAll();
  redirect("/settings?saved=1");
}
