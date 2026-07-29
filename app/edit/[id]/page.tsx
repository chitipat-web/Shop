import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth/access";
import { satangToInputText, todayLocal } from "@/lib/format";
import PurchaseForm from "@/components/PurchaseForm";

export const dynamic = "force-dynamic";

export default async function EditPurchasePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const idNum = Number(id);
  // A non-numeric id would make Postgres throw instead of returning no rows.
  if (!Number.isInteger(idNum) || idNum <= 0) redirect("/list");
  const user = await requireUser();
  const db = await getDb();
  const purchase = await db.getUnsettledPurchase(idNum);
  // Settled rows are locked; non-admins may only edit their own.
  if (!purchase || (!user.isAdmin && purchase.payer_id !== user.personId)) {
    redirect("/list");
  }
  const [stores, persons] = await Promise.all([
    db.getStores(),
    db.getPersons(),
  ]);

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">แก้ไขรายการ</h1>

      {error && (
        <p className="mb-4 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">
          {error === "personal"
            ? "ยอดของส่วนตัวรวมกันเกินยอดทั้งบิล ลองใหม่อีกครั้งครับ"
            : "กรอกไม่ครบหรือยอดเงินไม่ถูกต้อง ลองใหม่อีกครั้งครับ"}
        </p>
      )}

      <PurchaseForm
        stores={stores}
        persons={persons}
        today={todayLocal()}
        currentPersonId={user.personId}
        initial={{
          id: purchase.id,
          date: purchase.date,
          storeId: purchase.store_id,
          payerId: purchase.payer_id,
          amountText: satangToInputText(purchase.amount_satang),
          note: purchase.note ?? "",
          personalP1Text: purchase.personal_p1_satang
            ? satangToInputText(purchase.personal_p1_satang)
            : "",
          personalP2Text: purchase.personal_p2_satang
            ? satangToInputText(purchase.personal_p2_satang)
            : "",
          receiptUrl: purchase.receipt_url,
        }}
      />
    </div>
  );
}
