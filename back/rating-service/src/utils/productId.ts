/**
 * Accepts `product_456` or plain numeric strings; aligns with product routes using numeric ids.
 */
export function parseProductIdToInt(raw: unknown): number | null {
  if (raw === undefined || raw === null) return null;
  const s = String(raw).trim();
  const prefixed = /^product_(\d+)$/i.exec(s);
  if (prefixed) return parseInt(prefixed[1], 10);
  const n = parseInt(s, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}
