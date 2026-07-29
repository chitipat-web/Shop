import Link from "next/link";
import { getDb, type PurchaseRow } from "@/lib/db";
import { requireUser } from "@/lib/auth/access";
import { relativeThaiDate, satangToBahtText, todayLocal } from "@/lib/format";
import { deletePurchase } from "@/app/actions";
import Avatar from "@/components/Avatar";
import { BasketIcon, PencilIcon, ReceiptIcon, XIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function ListPage({
  searchParams,
}: {
  searchParams: Promise<{ added?: string; updated?: string }>;
}) {
  const { added, updated } = await searchParams;
  const user = await requireUser();
  const db = await getDb();
  const [purchases, summary, persons] = await Promise.all([
    db.getUnsettledPurchases(),
    db.getUnsettledSummary(),
    db.getPersons(),
  ]);
  const p1 = persons.find((p) => p.id === 1)!;
  const p2 = persons.find((p) => p.id === 2)!;
  const today = todayLocal();

  const byDate = new Map<string, PurchaseRow[]>();
  for (const purchase of purchases) {
    const list = byDate.get(purchase.date) ?? [];
    list.push(purchase);
    byDate.set(purchase.date, list);
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">รายการที่ยังไม่เคลียร์</h1>

      {(added || updated) && (
        <p className="mb-3 rounded-xl bg-teal-50 px-3.5 py-2 text-sm font-medium text-teal-800 ring-1 ring-teal-100">
          {updated ? "✓ แก้ไขรายการแล้ว" : "✓ บันทึกแล้ว"}
        </p>
      )}

      <div className="mb-5 rounded-2xl bg-gradient-to-br from-teal-700 to-emerald-700 p-5 text-white shadow-lg shadow-teal-900/20">
        <div className="flex items-baseline justify-between">
          <p className="text-sm text-teal-100">
            รวมทั้งหมด · {summary.count} รายการ
          </p>
        </div>
        <p className="mt-0.5 text-4xl font-bold tabular-nums tracking-tight">
          ₪{satangToBahtText(summary.total)}
        </p>
        <div className="mt-3 flex justify-between text-xs text-teal-50/90">
          <span className="flex items-center gap-1.5">
            <Avatar name={p1.name} personId={1} size="h-5 w-5 text-[10px]" />
            {p1.name} จ่ายไป ₪{satangToBahtText(summary.paid1)}
          </span>
          <span className="flex items-center gap-1.5">
            <Avatar name={p2.name} personId={2} size="h-5 w-5 text-[10px]" />
            {p2.name} จ่ายไป ₪{satangToBahtText(summary.paid2)}
          </span>
        </div>
        {summary.count > 0 && (
          <p
            data-testid="net-line"
            className="mt-3.5 rounded-xl bg-white/15 px-3 py-2 text-center text-sm font-semibold"
          >
            {summary.net1 === 0
              ? "ตอนนี้ยอดเท่ากันพอดี ไม่มีใครติดใคร 🎉"
              : summary.net1 > 0
                ? `ตอนนี้ ${p2.name} ติด ${p1.name} อยู่ ₪${satangToBahtText(summary.net1)}`
                : `ตอนนี้ ${p1.name} ติด ${p2.name} อยู่ ₪${satangToBahtText(-summary.net1)}`}
          </p>
        )}
      </div>

      {purchases.length === 0 ? (
        <div className="rounded-2xl bg-white py-12 text-center shadow-sm ring-1 ring-black/5">
          <BasketIcon className="mx-auto h-10 w-10 text-neutral-300" />
          <p className="mt-3 text-neutral-500">
            ยังไม่มีรายการ — ไปหน้า “เพิ่ม” เพื่อบันทึกของที่ซื้อ
          </p>
        </div>
      ) : (
        [...byDate.entries()].map(([date, items]) => (
          <section key={date} className="mb-5">
            <h2 className="mb-2 pl-1 text-xs font-semibold tracking-wide text-neutral-400">
              {relativeThaiDate(date, today)}
            </h2>
            <ul className="flex flex-col gap-2.5">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-3 rounded-2xl bg-white p-3.5 shadow-sm ring-1 ring-black/5"
                >
                  {item.receipt_url ? (
                    <a
                      href={item.receipt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="ดูสลิป"
                      className="shrink-0"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.receipt_url}
                        alt="สลิป"
                        className="h-10 w-10 rounded-xl object-cover ring-1 ring-black/10"
                      />
                    </a>
                  ) : (
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-neutral-100 text-neutral-500">
                      {item.store_has_receipt ? (
                        <ReceiptIcon className="h-5 w-5" />
                      ) : (
                        <PencilIcon className="h-5 w-5" />
                      )}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold leading-tight">
                      {item.store_name}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-neutral-400">
                      <Avatar
                        name={item.payer_name}
                        personId={item.payer_id}
                        size="h-4 w-4 text-[9px]"
                      />
                      <span className="whitespace-nowrap font-medium text-neutral-500">
                        {item.payer_name} จ่าย
                      </span>
                      {item.personal_p1_satang + item.personal_p2_satang > 0 && (
                        <span className="whitespace-nowrap rounded-md bg-violet-50 px-1.5 py-0.5 font-medium text-violet-600">
                          ส่วนตัว ₪
                          {satangToBahtText(
                            item.personal_p1_satang + item.personal_p2_satang
                          )}
                        </span>
                      )}
                      {item.note && (
                        <span className="truncate">· {item.note}</span>
                      )}
                    </p>
                  </div>
                  <span className="text-lg font-bold tabular-nums tracking-tight">
                    ₪{satangToBahtText(item.amount_satang)}
                  </span>
                  {(user.isAdmin || item.payer_id === user.personId) && (
                    <span className="flex items-center">
                      <Link
                        href={`/edit/${item.id}`}
                        aria-label="แก้ไขรายการ"
                        className="rounded-lg p-1.5 text-neutral-300 transition active:bg-teal-50 active:text-teal-700"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Link>
                      <form action={deletePurchase}>
                        <input type="hidden" name="id" value={item.id} />
                        <button
                          type="submit"
                          aria-label="ลบรายการ"
                          className="rounded-lg p-1.5 text-neutral-300 transition active:bg-red-50 active:text-red-600"
                        >
                          <XIcon className="h-4 w-4" />
                        </button>
                      </form>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
