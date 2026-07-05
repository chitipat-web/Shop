export function satangToBahtText(satang: number): string {
  const baht = satang / 100;
  return baht.toLocaleString("th-TH", {
    minimumFractionDigits: satang % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

/** Parse a baht string like "123", "1,234.50" into satang. Returns null if invalid. */
export function parseBahtToSatang(input: string): number | null {
  const cleaned = input.replace(/[,\s฿]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const satang = Math.round(parseFloat(cleaned) * 100);
  if (!Number.isFinite(satang) || satang <= 0) return null;
  return satang;
}

export function todayBangkok(): string {
  // sv-SE locale formats as YYYY-MM-DD
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" });
}

export function thaiDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const months = [
    "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
    "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
  ];
  return `${d} ${months[m - 1]} ${y + 543}`;
}

export function thaiMonth(label: string): string {
  const [y, m] = label.split("-").map(Number);
  const months = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
  ];
  return `${months[m - 1]} ${y + 543}`;
}
