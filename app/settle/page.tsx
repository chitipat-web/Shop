import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth/access";
import { satangToBahtText, thaiMonth } from "@/lib/format";
import { settleUp } from "@/app/actions";
import Avatar from "@/components/Avatar";
import { CheckCircleIcon, TransferIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function SettlePage({
  searchParams,
}: {
  searchParams: Promise<{ done?: string }>;
}) {
  const { done } = await searchParams;
  const user = await requireUser();
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
  const hasPersonal = summary.personal1 + summary.personal2 > 0;
  const shared = summary.total - summary.personal1 - summary.personal2;
  // Also split the display on an odd-satang total, where the halves differ.
  const showShares = hasPersonal || summary.share1 !== summary.share2;

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">เคลียร์ยอด</h1>

      {done && (
        <p className="mb-3 rounded-xl bg-teal-50 px-3 py-2 text-sm font-medium text-teal-800">
          ✓ เคลียร์ยอดเรียบร้อย รายการชุดนั้นถูกล็อกแล้ว
        </p>
      )}

      {summary.count === 0 ? (
        <div className="rounded-2xl bg-white py-12 text-center shadow-sm ring-1 ring-black/5">
          <CheckCircleIcon className="mx-auto h-10 w-10 text-teal-500" />
          <p className="mt-3 text-neutral-500">ไม่มีรายการค้างเคลียร์</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          <div className="bg-gradient-to-br from-teal-700 to-emerald-700 p-5 text-center text-white">
            <p className="text-sm text-teal-100">
              {summary.net1 === 0 ? "สรุปรอบนี้" : "สรุปรอบนี้ต้องโอน"}
            </p>
            {summary.net1 === 0 ? (
              <p className="mt-1 text-2xl font-bold leading-snug">
                ยอดเท่ากันพอดี ไม่ต้องโอน 🎉
              </p>
            ) : (
              <>
                <div className="mt-3 flex items-center justify-center gap-3">
                  <span className="flex flex-col items-center gap-1">
                    <Avatar
                      name={summary.net1 > 0 ? p2 : p1}
                      personId={summary.net1 > 0 ? 2 : 1}
                      size="h-11 w-11 text-base"
                    />
                    <span className="max-w-24 truncate text-xs text-teal-100">
                      {summary.net1 > 0 ? p2 : p1}
                    </span>
                  </span>
                  <span className="flex flex-col items-center px-1 text-teal-100">
                    <TransferIcon className="h-6 w-6" />
                    <span className="mt-0.5 text-[10px]">โอนให้</span>
                  </span>
                  <span className="flex flex-col items-center gap-1">
                    <Avatar
                      name={summary.net1 > 0 ? p1 : p2}
                      personId={summary.net1 > 0 ? 1 : 2}
                      size="h-11 w-11 text-base"
                    />
                    <span className="max-w-24 truncate text-xs text-teal-100">
                      {summary.net1 > 0 ? p1 : p2}
                    </span>
                  </span>
                </div>
                <p className="mt-2 text-3xl font-bold tabular-nums leading-snug">
                  ฿{satangToBahtText(Math.abs(summary.net1))}
                </p>
              </>
            )}
          </div>

          <div className="p-5">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-neutral-100">
                <tr>
                  <td className="py-2.5 text-neutral-500">รวมที่ซื้อด้วยกัน</td>
                  <td className="py-2.5 text-right font-semibold tabular-nums">
                    ฿{satangToBahtText(summary.total)}
                    <span className="ml-1 font-normal text-neutral-400">
                      ({summary.count} รายการ)
                    </span>
                  </td>
                </tr>
                {hasPersonal && (
                  <>
                    {summary.personal1 > 0 && (
                      <tr>
                        <td className="py-2.5 text-neutral-500">
                          ของส่วนตัว {p1} (ไม่หาร)
                        </td>
                        <td className="py-2.5 text-right tabular-nums">
                          ฿{satangToBahtText(summary.personal1)}
                        </td>
                      </tr>
                    )}
                    {summary.personal2 > 0 && (
                      <tr>
                        <td className="py-2.5 text-neutral-500">
                          ของส่วนตัว {p2} (ไม่หาร)
                        </td>
                        <td className="py-2.5 text-right tabular-nums">
                          ฿{satangToBahtText(summary.personal2)}
                        </td>
                      </tr>
                    )}
                    <tr>
                      <td className="py-2.5 text-neutral-500">
                        ของที่หารกันครึ่ง ๆ
                      </td>
                      <td className="py-2.5 text-right tabular-nums">
                        ฿{satangToBahtText(shared)}
                      </td>
                    </tr>
                  </>
                )}
                <tr>
                  <td className="py-2.5 text-neutral-500">
                    {showShares ? `${p1} ต้องออกทั้งหมด` : "หารครึ่ง คนละ"}
                  </td>
                  <td className="py-2.5 text-right font-semibold tabular-nums">
                    ฿{satangToBahtText(summary.share1)}
                  </td>
                </tr>
                {showShares && (
                  <tr>
                    <td className="py-2.5 text-neutral-500">
                      {p2} ต้องออกทั้งหมด
                    </td>
                    <td className="py-2.5 text-right font-semibold tabular-nums">
                      ฿{satangToBahtText(summary.share2)}
                    </td>
                  </tr>
                )}
                <tr>
                  <td className="py-2.5 text-neutral-500">{p1} จ่ายไปแล้ว</td>
                  <td className="py-2.5 text-right tabular-nums">
                    ฿{satangToBahtText(summary.paid1)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 text-neutral-500">{p2} จ่ายไปแล้ว</td>
                  <td className="py-2.5 text-right tabular-nums">
                    ฿{satangToBahtText(summary.paid2)}
                  </td>
                </tr>
              </tbody>
            </table>

            {user.isAdmin ? (
              <>
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
              </>
            ) : (
              <p className="mt-4 rounded-xl bg-neutral-50 px-3 py-3 text-center text-sm text-neutral-500">
                🔒 การกดเคลียร์ยอดทำได้โดยแอดมินเท่านั้น
              </p>
            )}
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
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-600">
                  <CheckCircleIcon className="h-5 w-5" />
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
