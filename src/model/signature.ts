// Turns finger movements into SVG path strings, and back into safe SVG markup.

export type Point = { x: number; y: number };

const round = (n: number) => Math.round(n * 10) / 10;
const pt = (p: Point) => `${round(p.x)} ${round(p.y)}`;

/**
 * One continuous finger stroke as an SVG path.
 * The line passes smoothly through the midpoints between touch samples
 * (quadratic curves), so fast strokes look like handwriting rather than a
 * chain of straight segments. A single tap becomes a small dot.
 */
export function pointsToPath(points: Point[]): string {
  if (points.length === 0) return '';
  const first = points[0];
  if (points.length === 1) return `M${pt(first)} L${pt({ x: first.x + 0.1, y: first.y })}`;
  if (points.length === 2) return `M${pt(first)} L${pt(points[1])}`;
  const parts = [`M${pt(first)}`];
  for (let i = 1; i < points.length - 1; i++) {
    const mid = { x: (points[i].x + points[i + 1].x) / 2, y: (points[i].y + points[i + 1].y) / 2 };
    parts.push(`Q${pt(points[i])} ${pt(mid)}`);
  }
  parts.push(`L${pt(points[points.length - 1])}`);
  return parts.join(' ');
}

/** Only path commands and numbers are allowed, so saved data can never inject markup into the PDF. */
export function isSafePath(path: string): boolean {
  return /^[MLQml0-9.\s-]+$/.test(path);
}

export function hasInk(strokes: string[]): boolean {
  return strokes.some((s) => s.trim().length > 0);
}

// ---------- Recording finger strokes ----------

/** The parts of a React Native touch event the recorder needs. */
export type TouchSample = {
  identifier?: number | string;
  pageX: number;
  pageY: number;
  locationX: number;
  locationY: number;
  touches?: readonly TouchSample[];
};

/** Points closer together than this (in screen points) add nothing visible. */
const MIN_STEP = 0.75;

/**
 * Records finger strokes inside a pad of a given size.
 *
 * Positions are taken from the screen position of the finger (pageX/pageY)
 * minus the pad's position, worked out once when the finger goes down. On
 * iPhone, locationX/locationY are measured from whatever element the finger
 * first touched, which is not always the pad, so they are not used after the
 * first touch. Only the finger that started the stroke is followed, so a
 * resting palm or second finger cannot make the line jump.
 */
export function createStrokeRecorder() {
  let size = { width: 0, height: 0 };
  let origin: Point | null = null;
  let finger: number | string | undefined;
  let points: Point[] = [];

  const clamp = (value: number, max: number) => Math.min(max, Math.max(0, value));

  function trackedTouch(sample: TouchSample): TouchSample {
    if (finger === undefined || !sample.touches?.length) return sample;
    return sample.touches.find((t) => t.identifier === finger) ?? sample;
  }

  function toPoint(sample: TouchSample): Point {
    const o = origin ?? { x: 0, y: 0 };
    return { x: clamp(sample.pageX - o.x, size.width), y: clamp(sample.pageY - o.y, size.height) };
  }

  return {
    setSize(width: number, height: number) {
      size = { width, height };
    },

    /** Finger down: starts a new stroke. */
    begin(sample: TouchSample) {
      origin = { x: sample.pageX - sample.locationX, y: sample.pageY - sample.locationY };
      finger = sample.identifier;
      points = [toPoint(sample)];
    },

    /** Finger moved. Returns true if the stroke changed and should be redrawn. */
    move(sample: TouchSample): boolean {
      if (!origin) return false;
      const touch = trackedTouch(sample);
      if (finger !== undefined && touch.identifier !== undefined && touch.identifier !== finger) return false;
      const next = toPoint(touch);
      const last = points[points.length - 1];
      if (Math.hypot(next.x - last.x, next.y - last.y) < MIN_STEP) return false;
      points.push(next);
      return true;
    },

    /** Finger lifted (or the touch was interrupted). Returns the finished stroke, or '' if none. */
    end(): string {
      const path = origin ? pointsToPath(points) : '';
      origin = null;
      finger = undefined;
      points = [];
      return path;
    },

    /** The stroke being drawn right now, for live display. */
    currentPath(): string {
      return origin ? pointsToPath(points) : '';
    },

    currentPoints(): readonly Point[] {
      return points;
    },
  };
}

export type StrokeRecorder = ReturnType<typeof createStrokeRecorder>;

// ---------- Showing signatures ----------

export type Box = { x: number; y: number; width: number; height: number };

/** Every absolute x,y point in a path (M, L and Q commands). Old relative "l" dots are skipped. */
function absolutePoints(d: string): Point[] {
  const result: Point[] = [];
  for (const segment of d.match(/[MLQml][^MLQml]*/g) ?? []) {
    const command = segment[0];
    if (command !== command.toUpperCase()) continue;
    const numbers = segment.slice(1).trim().split(/\s+/).filter(Boolean).map(Number);
    for (let i = 0; i + 1 < numbers.length; i += 2) result.push({ x: numbers[i], y: numbers[i + 1] });
  }
  return result.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
}

/**
 * The area that actually has ink, plus a small margin, so a signature fills
 * the signature line instead of floating in the middle of the empty pad.
 * Falls back to the whole pad if nothing can be measured.
 */
export function inkBox(strokes: string[], width: number, height: number): Box {
  const points = strokes.filter(isSafePath).flatMap(absolutePoints);
  if (points.length === 0) return { x: 0, y: 0, width: Math.max(1, width), height: Math.max(1, height) };
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
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
