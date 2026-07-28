"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { del, put } from "@vercel/blob";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth/access";
import {
  parseBahtToSatang,
  parseOptionalBahtToSatang,
  todayBangkok,
} from "@/lib/format";

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

async function deleteReceiptBlob(url: string | null) {
  if (!url || !process.env.BLOB_READ_WRITE_TOKEN) return;
  try {
    await del(url);
  } catch {
    // A stale blob is harmless; never fail the user action over cleanup.
  }
}

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/list");
  revalidatePath("/settle");
  revalidatePath("/settings");
}

/** Shared parse+validate for add and edit. Null when anything is invalid. */
function parsePurchaseForm(formData: FormData) {
  const storeId = Number(formData.get("store_id"));
  const payerId = Number(formData.get("payer_id"));
  const amount = parseBahtToSatang(String(formData.get("amount") ?? ""));
  const personalP1 = parseOptionalBahtToSatang(
    String(formData.get("personal_p1") ?? "")
  );
  const personalP2 = parseOptionalBahtToSatang(
    String(formData.get("personal_p2") ?? "")
  );
  const rawDate = String(formData.get("date") ?? "");
  const date = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : todayBangkok();
  const note = String(formData.get("note") ?? "").trim().slice(0, 500);

  if (
    !storeId ||
    !payerId ||
    amount === null ||
    personalP1 === null ||
    personalP2 === null
  ) {
    return null;
  }
  if (personalP1 + personalP2 > amount) {
    return { error: "personal" as const };
  }
  return {
    input: {
      date,
      storeId,
      payerId,
      amountSatang: amount,
      personalP1Satang: personalP1,
      personalP2Satang: personalP2,
      note: note || null,
    },
  };
}

export async function addPurchase(formData: FormData) {
  await requireUser();
  const parsed = parsePurchaseForm(formData);
  if (!parsed) redirect("/?error=invalid");
  if ("error" in parsed) redirect(`/?error=${parsed.error}`);

  const receiptUrl = await uploadReceipt(formData.get("receipt"));

  const db = await getDb();
  await db.insertPurchase(parsed.input, receiptUrl);

  revalidateAll();
  // Stay on quick-add so back-to-back entries are fast.
  redirect("/?added=1");
}

export async function updatePurchase(formData: FormData) {
  const user = await requireUser();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) redirect("/list");

  const parsed = parsePurchaseForm(formData);
  if (!parsed) redirect(`/edit/${id}?error=invalid`);
  if ("error" in parsed) redirect(`/edit/${id}?error=${parsed.error}`);

  const db = await getDb();
  // Also the permission check: non-admins may only touch their own rows.
  const current = await db.getUnsettledPurchase(id);
  if (!current || (!user.isAdmin && current.payer_id !== user.personId)) {
    redirect("/list");
  }

  // undefined = keep photo, null = remove, string = replace.
  let receiptUrl: string | null | undefined = undefined;
  if (formData.get("remove_receipt") === "on") receiptUrl = null;
  const uploaded = await uploadReceipt(formData.get("receipt"));
  if (uploaded) receiptUrl = uploaded;

  const updated = await db.updateUnsettledPurchase(
    id,
    parsed.input,
    receiptUrl,
    user.isAdmin ? undefined : user.personId
  );
  if (updated && receiptUrl !== undefined && current.receipt_url !== receiptUrl) {
    // The old photo is no longer referenced by anything.
    await deleteReceiptBlob(current.receipt_url);
  } else if (!updated && uploaded) {
    // Row got settled/removed mid-edit; the fresh upload is now orphaned.
    await deleteReceiptBlob(uploaded);
  }

  revalidateAll();
  redirect("/list?updated=1");
}

export async function deletePurchase(formData: FormData) {
  const user = await requireUser();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) return;
  const db = await getDb();
  // Never touch already-settled records; non-admins may only delete their own.
  const current = await db.getUnsettledPurchase(id);
  if (!current || (!user.isAdmin && current.payer_id !== user.personId)) {
    revalidateAll();
    return;
  }
  const deleted = await db.deleteUnsettledPurchase(
    id,
    user.isAdmin ? undefined : user.personId
  );
  if (deleted) await deleteReceiptBlob(current.receipt_url);
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
