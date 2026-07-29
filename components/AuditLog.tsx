import type { AuditRow, AuditSnapshot, Person, Store } from "@/lib/db";
import { israelDateTimeText, satangToBahtText, thaiDate } from "@/lib/format";
import { PencilIcon, XIcon } from "./icons";

function buildDiffs(
  before: AuditSnapshot,
  after: AuditSnapshot,
  storeName: (id: number) => string,
  personName: (id: number) => string
): string[] {
  const out: string[] = [];
  if (before.amount_satang !== after.amount_satang) {
    out.push(
      `ยอด ₪${satangToBahtText(before.amount_satang)} → ₪${satangToBahtText(after.amount_satang)}`
    );
  }
  if (before.store_id !== after.store_id) {
    out.push(`ร้าน ${storeName(before.store_id)} → ${storeName(after.store_id)}`);
  }
  if (before.payer_id !== after.payer_id) {
    out.push(
      `คนจ่าย ${personName(before.payer_id)} → ${personName(after.payer_id)}`
    );
  }
  if (before.date !== after.date) {
    out.push(`วันที่ ${thaiDate(before.date)} → ${thaiDate(after.date)}`);
  }
  for (const key of ["personal_p1_satang", "personal_p2_satang"] as const) {
    if (before[key] !== after[key]) {
      const who = personName(key === "personal_p1_satang" ? 1 : 2);
      out.push(
        `ของส่วนตัว ${who} ₪${satangToBahtText(before[key])} → ₪${satangToBahtText(after[key])}`
      );
    }
  }
  if ((before.note ?? "") !== (after.note ?? "")) {
    out.push(`โน้ต "${before.note ?? "—"}" → "${after.note ?? "—"}"`);
  }
  if (before.receipt_url !== after.receipt_url) {
    out.push(
      !before.receipt_url
        ? "เพิ่มรูปสลิป"
        : !after.receipt_url
          ? "ลบรูปสลิป"
          : "เปลี่ยนรูปสลิป"
    );
  }
  return out;
}

export default function AuditLog({
  rows,
  stores,
  persons,
}: {
  rows: AuditRow[];
  stores: Store[];
  persons: Person[];
}) {
  const storeName = (id: number) =>
    stores.find((s) => s.id === id)?.name ?? `ร้าน #${id}`;
  const personName = (id: number) =>
    persons.find((p) => p.id === id)?.name ?? `คนที่ ${id}`;

  return (
    <ul className="flex flex-col divide-y divide-neutral-100">
      {rows.map((row) => {
        const before = JSON.parse(row.before_json) as AuditSnapshot;
        const isDelete = row.action === "delete";
        const diffs = isDelete
          ? []
          : buildDiffs(
              before,
              JSON.parse(row.after_json!) as AuditSnapshot,
              storeName,
              personName
            );
        return (
          <li key={row.id} className="flex gap-2.5 py-3 text-sm">
            <span
              className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg ${
                isDelete ? "bg-red-50 text-red-500" : "bg-teal-50 text-teal-600"
              }`}
            >
              {isDelete ? (
                <XIcon className="h-4 w-4" />
              ) : (
                <PencilIcon className="h-4 w-4" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-neutral-700">
                {row.actor_name}{" "}
                {isDelete ? "ลบรายการ" : "แก้ไขรายการ"}{" "}
                <span className="text-neutral-400">
                  {storeName(before.store_id)} · ₪
                  {satangToBahtText(before.amount_satang)} ·{" "}
                  {thaiDate(before.date)}
                </span>
              </p>
              {diffs.length > 0 ? (
                <ul className="mt-1 flex flex-col gap-0.5 text-xs text-neutral-500">
                  {diffs.map((d, i) => (
                    <li key={i}>· {d}</li>
                  ))}
                </ul>
              ) : (
                !isDelete && (
                  <p className="mt-1 text-xs text-neutral-400">
                    บันทึกโดยไม่มีการเปลี่ยนค่า
                  </p>
                )
              )}
              <p className="mt-1 text-xs text-neutral-400">
                {israelDateTimeText(row.at)}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
