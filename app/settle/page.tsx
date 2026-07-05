import { getPersons, getSettlements, getUnsettledSummary } from "@/lib/db";
import { satangToBahtText, thaiMonth } from "@/lib/format";
import { settleUp } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function SettlePage({
  searchParams,
}: {
  searchParams: Promise<{ done?: string }>;
}) {
  const { done } = await searchParams;
  const summary = getUnsettledSummary();
  const settlements = getSettlements();
  const persons = getPersons();
  const nameOf = (id: number) =>
    persons.find((p) => p.id === id)?.name ?? `คนที่ ${id}`;
  const p1 = nameOf(1);
  const p2 = nameOf(2);
  const share = Math.round(summary.total / 2);

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">เคลียร์ยอด</h1>

      {done && (
        <p className="mb-3 rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-800">
          ✓ เคลียร์ยอดเรียบร้อย รายการชุดนั้นถูกล็อกแล้ว
        </p>
      )}

      {summary.count === 0 ? (
        <p className="rounded-xl bg-white p-6 text-center text-neutral-500 shadow-sm">
          ไม่มีรายการค้างเคลียร์
        </p>
      ) : (
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <table className="w-full text-sm">
            <tbody>
              <tr>
                <td className="py-1 text-neutral-600">รวมที่ซื้อด้วยกัน</td>
                <td className="py-1 text-right font-semibold">
                  ฿{satangToBahtText(summary.total)} ({summary.count} รายการ)
                </td>
              </tr>
              <tr>
                <td className="py-1 text-neutral-600">หารครึ่ง คนละ</td>
                <td className="py-1 text-right font-semibold">
                  ฿{satangToBahtText(share)}
                </td>
              </tr>
              <tr>
                <td className="py-1 text-neutral-600">{p1} จ่ายไปแล้ว</td>
                <td className="py-1 text-right">
                  ฿{satangToBahtText(summary.paid1)}
                </td>
              </tr>
              <tr>
                <td className="py-1 text-neutral-600">{p2} จ่ายไปแล้ว</td>
                <td className="py-1 text-right">
                  ฿{satangToBahtText(summary.paid2)}
                </td>
              </tr>
            </tbody>
          </table>

          <p className="mt-4 rounded-lg bg-teal-50 px-3 py-3 text-center text-lg font-bold text-teal-800">
            {summary.net1 === 0
              ? "ยอดเท่ากันพอดี ไม่ต้องโอน 🎉"
              : summary.net1 > 0
                ? `${p2} โอนให้ ${p1} ฿${satangToBahtText(summary.net1)}`
                : `${p1} โอนให้ ${p2} ฿${satangToBahtText(-summary.net1)}`}
          </p>

          <form action={settleUp} className="mt-4">
            <button
              type="submit"
              className="w-full rounded-xl bg-teal-600 py-3.5 text-base font-bold text-white active:bg-teal-700"
            >
              เคลียร์แล้ว ✓ (ล็อกรายการชุดนี้)
            </button>
          </form>
          <p className="mt-2 text-center text-xs text-neutral-400">
            รายการที่จดเพิ่มหลังจากนี้จะไปเข้ารอบถัดไป
          </p>
        </div>
      )}

      {settlements.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-semibold text-neutral-500">
            ประวัติการเคลียร์
          </h2>
          <ul className="flex flex-col gap-2">
            {settlements.map((s) => (
              <li key={s.id} className="rounded-xl bg-white p-3 shadow-sm">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold">{thaiMonth(s.label)}</span>
                  <span className="text-neutral-500">
                    รวม ฿{satangToBahtText(s.total_satang)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-neutral-600">
                  {s.amount_satang === 0
                    ? "ยอดเท่ากัน ไม่มีการโอน"
                    : `${nameOf(s.from_person)} โอนให้ ${nameOf(s.to_person)} ฿${satangToBahtText(s.amount_satang)}`}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
