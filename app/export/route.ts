import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth/access";

export const dynamic = "force-dynamic";

function csvCell(value: string): string {
  // Leading =, +, -, @, tab, CR would execute as a formula in Excel/Sheets.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

function baht(satang: number): string {
  return (satang / 100).toFixed(2);
}

export async function GET() {
  await requireUser();
  const db = await getDb();
  const [rows, persons] = await Promise.all([
    db.getAllPurchasesForExport(),
    db.getPersons(),
  ]);
  const nameOf = (id: number) =>
    persons.find((p) => p.id === id)?.name ?? `คนที่ ${id}`;

  const header = [
    "วันที่",
    "ร้าน",
    "คนจ่าย",
    "ยอดรวม (₪)",
    `ของส่วนตัว ${nameOf(1)} (₪)`,
    `ของส่วนตัว ${nameOf(2)} (₪)`,
    "ยอดที่หารกัน (₪)",
    "โน้ต",
    "สถานะ",
    "ลิงก์สลิป",
  ];
  const lines = [header.map(csvCell).join(",")];
  for (const row of rows) {
    lines.push(
      [
        row.date,
        row.store_name,
        row.payer_name,
        baht(row.amount_satang),
        baht(row.personal_p1_satang),
        baht(row.personal_p2_satang),
        baht(
          row.amount_satang - row.personal_p1_satang - row.personal_p2_satang
        ),
        row.note ?? "",
        row.settlement_label
          ? `เคลียร์แล้ว (${row.settlement_label})`
          : "ยังไม่เคลียร์",
        row.receipt_url ?? "",
      ]
        .map(csvCell)
        .join(",")
    );
  }

  // BOM so Excel opens Thai text as UTF-8.
  const csv = "\uFEFF" + lines.join("\r\n") + "\r\n";
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="shop-purchases.csv"',
    },
  });
}
