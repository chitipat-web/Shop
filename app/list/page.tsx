import { getDb, type PurchaseRow } from "@/lib/db";
import { requireUser } from "@/lib/auth/access";
import { satangToBahtText, thaiDate } from "@/lib/format";
import { deletePurchase } from "@/app/actions";

export const dynamic = "force-dynamic";

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
        <p className="mb-3 rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-800">
          ✓ บันทึกแล้ว
        </p>
      )}

      <div className="mb-4 rounded-xl bg-white p-4 shadow-sm">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-neutral-600">รวมทั้งหมด</span>
          <span className="text-2xl font-bold">
            ฿{satangToBahtText(summary.total)}
          </span>
        </div>
        <div className="mt-2 flex justify-between text-sm text-neutral-600">
          <span>
            {p1.name} จ่ายไป ฿{satangToBahtText(summary.paid1)}
          </span>
          <span>
            {p2.name} จ่ายไป ฿{satangToBahtText(summary.paid2)}
          </span>
        </div>
        {summary.count > 0 && (
          <p className="mt-3 border-t border-neutral-100 pt-3 text-sm font-semibold text-teal-700">
            {summary.net1 === 0
              ? "ตอนนี้ยอดเท่ากันพอดี ไม่มีใครติดใคร"
              : summary.net1 > 0
                ? `ตอนนี้ ${p2.name} ติด ${p1.name} อยู่ ฿${satangToBahtText(summary.net1)}`
                : `ตอนนี้ ${p1.name} ติด ${p2.name} อยู่ ฿${satangToBahtText(-summary.net1)}`}
          </p>
        )}
      </div>

      {purchases.length === 0 ? (
        <p className="py-10 text-center text-neutral-500">
          ยังไม่มีรายการ — ไปหน้า “เพิ่ม” เพื่อบันทึกของที่ซื้อ
        </p>
      ) : (
        [...byDate.entries()].map(([date, items]) => (
          <section key={date} className="mb-4">
            <h2 className="mb-2 text-sm font-semibold text-neutral-500">
              {thaiDate(date)}
            </h2>
            <ul className="flex flex-col gap-2">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      {item.store_name}{" "}
                      <span className="font-normal text-neutral-400">
                        · {item.payer_name} จ่าย
                      </span>
                    </p>
                    {item.note && (
                      <p className="truncate text-sm text-neutral-500">
                        {item.note}
                      </p>
                    )}
                  </div>
                  <span className="text-lg font-bold">
                    ฿{satangToBahtText(item.amount_satang)}
                  </span>
                  <form action={deletePurchase}>
                    <input type="hidden" name="id" value={item.id} />
                    <button
                      type="submit"
                      aria-label="ลบรายการ"
                      className="rounded-lg px-2 py-1 text-neutral-400 active:bg-red-50 active:text-red-600"
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
