import Link from "next/link";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth/access";
import { satangToBahtText, todayBangkok } from "@/lib/format";
import QuickAddForm from "@/components/QuickAddForm";

export const dynamic = "force-dynamic";

export default async function QuickAddPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; added?: string }>;
}) {
  const { error, added } = await searchParams;
  const { personId } = await requireUser();
  const db = await getDb();
  const [stores, persons, summary] = await Promise.all([
    db.getStores(),
    db.getPersons(),
    db.getUnsettledSummary(),
  ]);
  const p1 = persons.find((p) => p.id === 1)!;
  const p2 = persons.find((p) => p.id === 2)!;

  return (
    <div>
      {added && (
        <p className="mb-4 flex items-center gap-2 rounded-xl bg-teal-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-md shadow-teal-600/25">
          ✓ บันทึกแล้ว — จดรายการต่อได้เลย
        </p>
      )}
      {error && (
        <p className="mb-4 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">
          กรอกไม่ครบหรือยอดเงินไม่ถูกต้อง ลองใหม่อีกครั้งครับ
        </p>
      )}

      {summary.count > 0 && (
        <Link
          href="/list"
          className="mb-5 flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-black/5"
        >
          <span className="text-sm text-neutral-500">
            รอบนี้ ฿{satangToBahtText(summary.total)} ·{" "}
            <span className="font-semibold text-neutral-700">
              {summary.net1 === 0
                ? "ยอดเท่ากันพอดี"
                : summary.net1 > 0
                  ? `${p2.name} ติด ${p1.name} ฿${satangToBahtText(summary.net1)}`
                  : `${p1.name} ติด ${p2.name} ฿${satangToBahtText(-summary.net1)}`}
            </span>
          </span>
          <span className="text-neutral-300">›</span>
        </Link>
      )}

      <h1 className="mb-4 text-xl font-bold">บันทึกของที่ซื้อ</h1>
      <QuickAddForm
        stores={stores}
        persons={persons}
        today={todayBangkok()}
        currentPersonId={personId}
      />
    </div>
  );
}
