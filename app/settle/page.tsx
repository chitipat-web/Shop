import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth/access";
import { satangToBahtText, thaiMonth } from "@/lib/format";
import { settleUp } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function SettlePage({
  searchParams,
}: {
  searchParams: Promise<{ done?: string }>;
}) {
  const { done } = await searchParams;
  await requireUser();
  const db = await getDb();
  const [summary, settlements, persons] = await Promise.all([
    db.getUnsettledSummary(),
    db.getSettlements(),
    db.getPersons(),
  ]);
  const nameOf = (id: number) =>
    persons.find((p) => p.id === id)?.name ?? `คนที่ ${id}`;
  const p1 = nameOf(1);
  const p2 = nameOf(2);
  const share = Math.round(summary.total / 2);

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">เคลียร์ยอด</h1>

      {done && (
        <p className="mb-3 rounded-xl bg-teal-50 px-3 py-2 text-sm font-medium text-teal-800">
          ✓ เคลียร์ยอดเรียบร้อย รายการชุดนั้นถูกล็อกแล้ว
        </p>
      )}

      {summary.count === 0 ? (
        <div className="rounded-2xl bg-white py-12 text-center shadow-sm">
          <p className="text-4xl">✨</p>
          <p className="mt-2 text-neutral-500">ไม่มีรายการค้างเคลียร์</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="bg-gradient-to-br from-teal-600 to-emerald-700 p-5 text-center text-white">
            <p className="text-sm text-teal-100">
              {summary.net1 === 0 ? "สรุปรอบนี้" : "สรุปรอบนี้ต้องโอน"}
            </p>
            <p className="mt-1 text-2xl font-bold leading-snug">
              {summary.net1 === 0
                ? "ยอดเท่ากันพอดี ไม่ต้องโอน 🎉"
                : summary.net1 > 0
                  ? `${p2} โอนให้ ${p1} ฿${satangToBahtText(summary.net1)}`
                  : `${p1} โอนให้ ${p2} ฿${satangToBahtText(-summary.net1)}`}
            </p>
          </div>

          <div className="p-5">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-neutral-100">
                <tr>
                  <td className="py-2.5 text-neutral-500">รวมที่ซื้อด้วยกัน</td>
                  <td className="py-2.5 text-right font-semibold">
                    ฿{satangToBahtText(summary.total)}
                    <span className="ml-1 font-normal text-neutral-400">
                      ({summary.count} รายการ)
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 text-neutral-500">หารครึ่ง คนละ</td>
                  <td className="py-2.5 text-right font-semibold">
                    ฿{satangToBahtText(share)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 text-neutral-500">{p1} จ่ายไปแล้ว</td>
                  <td className="py-2.5 text-right">
                    ฿{satangToBahtText(summary.paid1)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 text-neutral-500">{p2} จ่ายไปแล้ว</td>
                  <td className="py-2.5 text-right">
                    ฿{satangToBahtText(summary.paid2)}
                  </td>
                </tr>
              </tbody>
            </table>

            <form action={settleUp} className="mt-4">
              <button
                type="submit"
                className="w-full rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-600 py-3.5 text-base font-bold text-white shadow-lg shadow-teal-600/30 transition active:scale-[0.98]"
              >
                เคลียร์แล้ว ✓ (ล็อกรายการชุดนี้)
              </button>
            </form>
            <p className="mt-2.5 text-center text-xs text-neutral-400">
              รายการที่จดเพิ่มหลังจากนี้จะไปเข้ารอบถัดไป
            </p>
          </div>
        </div>
      )}

      {settlements.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 pl-1 text-xs font-semibold tracking-wide text-neutral-400">
            ประวัติการเคลียร์
          </h2>
          <ul className="flex flex-col gap-2.5">
            {settlements.map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal-50 text-lg">
                  ✅
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold leading-tight">
                    {thaiMonth(s.label)}
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {s.amount_satang === 0
                      ? "ยอดเท่ากัน ไม่มีการโอน"
                      : `${nameOf(s.from_person)} โอนให้ ${nameOf(s.to_person)} ฿${satangToBahtText(s.amount_satang)}`}
                  </p>
                </div>
                <span className="text-sm font-semibold text-neutral-400">
                  ฿{satangToBahtText(s.total_satang)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
