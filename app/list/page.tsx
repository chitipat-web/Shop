import { getDb, type PurchaseRow } from "@/lib/db";
import { requireUser } from "@/lib/auth/access";
import { satangToBahtText, thaiDate } from "@/lib/format";
import { deletePurchase } from "@/app/actions";

export const dynamic = "force-dynamic";

const payerChip: Record<number, string> = {
  1: "bg-teal-50 text-teal-700",
  2: "bg-amber-50 text-amber-700",
};

export default async function ListPage({
  searchParams,
}: {
  searchParams: Promise<{ added?: string }>;
}) {
  const { added } = await searchParams;
  await requireUser();
  const db = await getDb();
  const [purchases, summary, persons] = await Promise.all([
    db.getUnsettledPurchases(),
    db.getUnsettledSummary(),
    db.getPersons(),
  ]);
  const p1 = persons.find((p) => p.id === 1)!;
  const p2 = persons.find((p) => p.id === 2)!;

  const byDate = new Map<string, PurchaseRow[]>();
  for (const purchase of purchases) {
    const list = byDate.get(purchase.date) ?? [];
    list.push(purchase);
    byDate.set(purchase.date, list);
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">รายการที่ยังไม่เคลียร์</h1>

      {added && (
        <p className="mb-3 rounded-xl bg-teal-50 px-3 py-2 text-sm font-medium text-teal-800">
          ✓ บันทึกแล้ว
        </p>
      )}

      <div className="mb-5 rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-700 p-5 text-white shadow-lg shadow-teal-900/20">
        <p className="text-sm text-teal-100">รวมทั้งหมด</p>
        <p className="mt-0.5 text-4xl font-bold tracking-tight">
          ฿{satangToBahtText(summary.total)}
        </p>
        <div className="mt-3 flex justify-between text-xs text-teal-50/90">
          <span>
            {p1.name} จ่ายไป ฿{satangToBahtText(summary.paid1)}
          </span>
          <span>
            {p2.name} จ่ายไป ฿{satangToBahtText(summary.paid2)}
          </span>
        </div>
        {summary.count > 0 && (
          <p
            data-testid="net-line"
            className="mt-3 rounded-xl bg-white/15 px-3 py-2 text-center text-sm font-semibold"
          >
            {summary.net1 === 0
              ? "ตอนนี้ยอดเท่ากันพอดี ไม่มีใครติดใคร 🎉"
              : summary.net1 > 0
                ? `ตอนนี้ ${p2.name} ติด ${p1.name} อยู่ ฿${satangToBahtText(summary.net1)}`
                : `ตอนนี้ ${p1.name} ติด ${p2.name} อยู่ ฿${satangToBahtText(-summary.net1)}`}
          </p>
        )}
      </div>

      {purchases.length === 0 ? (
        <div className="rounded-2xl bg-white py-12 text-center shadow-sm">
          <p className="text-4xl">🧺</p>
          <p className="mt-2 text-neutral-500">
            ยังไม่มีรายการ — ไปหน้า “เพิ่ม” เพื่อบันทึกของที่ซื้อ
          </p>
        </div>
      ) : (
        [...byDate.entries()].map(([date, items]) => (
          <section key={date} className="mb-5">
            <h2 className="mb-2 pl-1 text-xs font-semibold tracking-wide text-neutral-400">
              {thaiDate(date)}
            </h2>
            <ul className="flex flex-col gap-2.5">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-3 rounded-2xl bg-white p-3.5 shadow-sm"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-neutral-100 text-lg">
                    {item.store_has_receipt ? "🧾" : "🛍️"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold leading-tight">
                      {item.store_name}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-neutral-400">
                      <span
                        className={`rounded-md px-1.5 py-0.5 font-medium ${payerChip[item.payer_id] ?? "bg-neutral-100 text-neutral-600"}`}
                      >
                        {item.payer_name} จ่าย
                      </span>
                      {item.note && <span className="truncate">{item.note}</span>}
                    </p>
                  </div>
                  <span className="text-lg font-bold tracking-tight">
                    ฿{satangToBahtText(item.amount_satang)}
                  </span>
                  <form action={deletePurchase}>
                    <input type="hidden" name="id" value={item.id} />
                    <button
                      type="submit"
                      aria-label="ลบรายการ"
                      className="rounded-lg px-2 py-1 text-neutral-300 transition active:bg-red-50 active:text-red-600"
                    >
                      ✕
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
