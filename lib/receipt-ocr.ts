// Pure text analysis for receipt OCR — kept DOM-free so it can be unit-tested.
//
// Israeli receipts label the grand total with סה"כ / סך הכל / לתשלום
// (often mangled by OCR around the gershayim), so keyword lines win;
// otherwise the largest decimal amount on the receipt is almost always
// the total, since the total is >= every item line.

const AMOUNT_RE = /(\d{1,3}(?:,\d{3})+|\d+)\.(\d{2})(?!\d)/g;
const TOTAL_RE = /סה.{0,2}כ|סך\s?הכל|לתשלום|total/i;
// Lines whose amount is NOT the bill total even when a total keyword appears:
// VAT breakdown, cash tendered, change.
const EXCLUDE_RE = /מע.{0,2}מ|מזומן|עודף/;

function lineAmounts(line: string): number[] {
  const out: number[] = [];
  for (const m of line.matchAll(AMOUNT_RE)) {
    const value = Math.round(parseFloat(m[1].replace(/,/g, "")) * 100 + Number(m[2]));
    // Ignore implausible money values (barcodes, card numbers, weights).
    if (value >= 1 && value <= 99999_99) out.push(value);
  }
  return out;
}

/**
 * Find the receipt's total in raw OCR text.
 * Returns the amount in hundredths (agorot) or null when nothing plausible.
 */
export function extractReceiptTotal(text: string): number | null {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const keywordAmounts: number[] = [];
  const allAmounts: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const amounts = lineAmounts(line);
    if (!EXCLUDE_RE.test(line)) allAmounts.push(...amounts);
    if (TOTAL_RE.test(line) && !EXCLUDE_RE.test(line)) {
      if (amounts.length > 0) {
        keywordAmounts.push(...amounts);
      } else {
        // The label and the number sometimes land on adjacent lines.
        const next = lines[i + 1];
        if (next && !EXCLUDE_RE.test(next)) {
          keywordAmounts.push(...lineAmounts(next));
        }
      }
    }
  }

  if (keywordAmounts.length > 0) return Math.max(...keywordAmounts);
  if (allAmounts.length > 0) return Math.max(...allAmounts);
  return null;
}
