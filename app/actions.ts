"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { put } from "@vercel/blob";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth/access";
import { parseBahtToSatang, todayBangkok } from "@/lib/format";

const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;

async function uploadReceipt(file: unknown): Promise<string | null> {
  if (
    !(file instanceof File) ||
    file.size === 0 ||
    file.size > MAX_RECEIPT_BYTES ||
    !file.type.startsWith("image/") ||
    !process.env.BLOB_READ_WRITE_TOKEN
  ) {
    return null;
  }
  const ext = file.type === "image/png" ? "png" : "jpg";
  const blob = await put(`slips/slip.${ext}`, file, {
    access: "public",
    addRandomSuffix: true,
    contentType: file.type,
  });
  return blob.url;
}

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/list");
  revalidatePath("/settle");
  revalidatePath("/settings");
}

export async function addPurchase(formData: FormData) {
  await requireUser();
  const storeId = Number(formData.get("store_id"));
  const payerId = Number(formData.get("payer_id"));
  const amount = parseBahtToSatang(String(formData.get("amount") ?? ""));
  const date = String(formData.get("date") ?? "") || todayBangkok();
  const note = String(formData.get("note") ?? "").trim();

  if (!storeId || !payerId || amount === null) {
    redirect("/?error=invalid");
  }

  const receiptUrl = await uploadReceipt(formData.get("receipt"));

  const db = await getDb();
  await db.insertPurchase(
    date,
    storeId,
    payerId,
    amount,
    note || null,
    receiptUrl
  );

  revalidateAll();
  // Stay on quick-add so back-to-back entries are fast.
  redirect("/?added=1");
}

export async function deletePurchase(formData: FormData) {
  const user = await requireUser();
  const id = Number(formData.get("id"));
  const db = await getDb();
  // Never touch already-settled records; non-admins may only delete their own.
  await db.deleteUnsettledPurchase(id, user.isAdmin ? undefined : user.personId);
  revalidateAll();
}

export async function settleUp() {
  const user = await requireUser();
  if (!user.isAdmin) redirect("/settle");
  const db = await getDb();
  await db.settleAll(todayBangkok().slice(0, 7), new Date().toISOString());
  revalidateAll();
  redirect("/settle?done=1");
}

export async function updatePersonNames(formData: FormData) {
  const user = await requireUser();
  const editableIds = user.isAdmin ? [1, 2] : [user.personId];
  const db = await getDb();
  for (const id of editableIds) {
    const name = String(formData.get(`person_${id}`) ?? "").trim();
    if (name) {
      await db.updatePersonName(id, name);
    }
  }
  revalidateAll();
  redirect("/settings?saved=1");
}

export async function updateStore(formData: FormData) {
  const user = await requireUser();
  if (!user.isAdmin) redirect("/settings");
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
  const user = await requireUser();
  if (!user.isAdmin) redirect("/settings");
  const name = String(formData.get("name") ?? "").trim();
  const hasReceipt = formData.get("has_receipt") === "on" ? 1 : 0;
  if (name) {
    const db = await getDb();
    await db.insertStore(name, hasReceipt);
  }
  revalidateAll();
  redirect("/settings?saved=1");
}
