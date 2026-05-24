/**
 * Minimal RFC 4180 CSV writer. Quotes fields that contain a comma, double
 * quote, CR, or LF; escapes internal quotes by doubling them.
 */
export function csvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function csvRow(values: Array<string | number | null | undefined>): string {
  return values.map(csvField).join(",");
}
