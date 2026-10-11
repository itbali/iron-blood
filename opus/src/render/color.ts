const cache = new Map<string, string>();

/** Lighten (amount > 0) or darken (amount < 0) a #rrggbb colour. Cached: called many times per frame. */
export const shade = (hex: string, amount: number): string => {
  const key = `${hex}|${amount}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  if (amount < 0) {
    r *= 1 + amount;
    g *= 1 + amount;
    b *= 1 + amount;
  } else {
    r += (255 - r) * amount;
    g += (255 - g) * amount;
    b += (255 - b) * amount;
  }
  const out = `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
  cache.set(key, out);
  return out;
};

export const withAlpha = (hex: string, a: number): string => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};
