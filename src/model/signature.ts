// Turns finger movements into SVG path strings, and back into safe SVG markup.

export type Point = { x: number; y: number };

const round = (n: number) => Math.round(n * 10) / 10;

/** One continuous finger stroke as an SVG path. A single tap becomes a dot. */
export function pointsToPath(points: Point[]): string {
  if (points.length === 0) return '';
  const [first, ...rest] = points;
  const start = `M${round(first.x)} ${round(first.y)}`;
  if (rest.length === 0) return `${start} l0.1 0`;
  return `${start} ${rest.map((p) => `L${round(p.x)} ${round(p.y)}`).join(' ')}`;
}

/** Only path commands and numbers are allowed, so saved data can never inject markup into the PDF. */
export function isSafePath(path: string): boolean {
  return /^[MLml0-9.\s-]+$/.test(path);
}

export function hasInk(strokes: string[]): boolean {
  return strokes.some((s) => s.trim().length > 0);
}

export type Box = { x: number; y: number; width: number; height: number };

/**
 * The area that actually has ink, plus a small margin, so a signature fills
 * the signature line instead of floating in the middle of the empty pad.
 * Falls back to the whole pad if nothing can be measured.
 */
export function inkBox(strokes: string[], width: number, height: number): Box {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const d of strokes.filter(isSafePath)) {
    // Absolute points follow "M" or "L"; the tiny relative "l" used for dots is ignored.
    for (const match of d.matchAll(/[ML]\s*(-?[\d.]+)\s+(-?[\d.]+)/g)) {
      xs.push(Number(match[1]));
      ys.push(Number(match[2]));
    }
  }
  if (xs.length === 0) return { x: 0, y: 0, width: Math.max(1, width), height: Math.max(1, height) };
  const margin = 8;
  const minX = Math.min(...xs) - margin;
  const minY = Math.min(...ys) - margin;
  return {
    x: Math.round(minX),
    y: Math.round(minY),
    width: Math.max(1, Math.round(Math.max(...xs) + margin - minX)),
    height: Math.max(1, Math.round(Math.max(...ys) + margin - minY)),
  };
}

export function viewBoxFor(strokes: string[], width: number, height: number): string {
  const box = inkBox(strokes, width, height);
  return `${box.x} ${box.y} ${box.width} ${box.height}`;
}

/** An <svg> element showing the strokes, scaled to fit whatever box it is placed in. */
export function signatureSvg(strokes: string[], width: number, height: number): string {
  const paths = strokes
    .filter(isSafePath)
    .map((d) => `<path d="${d}" />`)
    .join('');
  return (
    `<svg class="sig-svg" xmlns="http://www.w3.org/2000/svg" viewBox="${viewBoxFor(strokes, width, height)}" ` +
    `preserveAspectRatio="xMinYMax meet">` +
    `<g fill="none" stroke="#111" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" ` +
    `vector-effect="non-scaling-stroke">${paths}</g></svg>`
  );
}
