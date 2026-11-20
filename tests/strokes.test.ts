import { createStrokeRecorder, hasInk, inkBox, isSafePath, pointsToPath } from '../src/model/signature';
import { handwritingStroke, pathNumbers, touchAt } from './gestures';

const PAD_X = 16;
const PAD_Y = 310;

function recorder() {
  const r = createStrokeRecorder();
  r.setSize(340, 220);
  return r;
}

function draw(r: ReturnType<typeof recorder>, points: { x: number; y: number }[], options = {}) {
  r.begin(touchAt(PAD_X, PAD_Y, points[0].x, points[0].y, options));
  for (const p of points.slice(1)) r.move(touchAt(PAD_X, PAD_Y, p.x, p.y, options));
  return r.end();
}

/** Largest distance between consecutive recorded points: a gap shows up as a big jump. */
function largestJump(r: ReturnType<typeof recorder>, points: { x: number; y: number }[]) {
  r.begin(touchAt(PAD_X, PAD_Y, points[0].x, points[0].y));
  let largest = 0;
  let prev = r.currentPoints()[0];
  for (const p of points.slice(1)) {
    r.move(touchAt(PAD_X, PAD_Y, p.x, p.y));
    const last = r.currentPoints()[r.currentPoints().length - 1];
    largest = Math.max(largest, Math.hypot(last.x - prev.x, last.y - prev.y));
    prev = last;
  }
  r.end();
  return largest;
}

describe('recording finger strokes', () => {
  it('turns a continuous movement into ONE connected stroke that keeps every movement point', () => {
    const r = recorder();
    const points = handwritingStroke(20, 110);
    const path = draw(r, points);
    expect(path.startsWith(`M${points[0].x} `)).toBe(true);
    expect(path.match(/M/g)).toHaveLength(1); // one stroke, never restarted
    expect(path.match(/Q/g)).toHaveLength(points.length - 2); // every middle point used
    const nums = pathNumbers(path);
    expect(nums.slice(-2)).toEqual([Math.round(points.at(-1)!.x * 10) / 10, Math.round(points.at(-1)!.y * 10) / 10]);
    expect(isSafePath(path)).toBe(true);
  });

  it('has no gaps: consecutive recorded points stay as close as the finger samples', () => {
    const points = handwritingStroke(20, 110, 80);
    const fingerStep = Math.max(...points.slice(1).map((p, i) => Math.hypot(p.x - points[i].x, p.y - points[i].y)));
    expect(largestJump(recorder(), points)).toBeLessThanOrEqual(fingerStep + 0.01);
  });

  it('follows the finger even when iPhone reports locationX/Y relative to another element', () => {
    const r = recorder();
    // Finger lands on the pad, then iOS reports positions relative to a child 100 pt across.
    r.begin(touchAt(PAD_X, PAD_Y, 40, 100));
    r.move(touchAt(PAD_X, PAD_Y, 44, 104, { locationOffset: { x: 100, y: 80 } }));
    r.move(touchAt(PAD_X, PAD_Y, 48, 108, { locationOffset: { x: -50, y: 20 } }));
    expect(r.currentPoints()).toEqual([
      { x: 40, y: 100 },
      { x: 44, y: 104 },
      { x: 48, y: 108 },
    ]);
  });

  it('lifting and putting the finger down again makes separate strokes', () => {
    const r = recorder();
    const first = draw(r, handwritingStroke(20, 100, 30));
    const second = draw(r, handwritingStroke(150, 120, 30));
    const dot = draw(r, [{ x: 300, y: 60 }]);
    expect(first).not.toEqual(second);
    expect(second.startsWith('M150 ')).toBe(true); // starts where the finger went down, not joined to stroke 1
    expect(dot).toBe('M300 60 L300.1 60'); // a tap (dotting an i) is kept as a dot
    expect([first, second, dot].every(isSafePath)).toBe(true);
  });

  it('ignores a second finger or resting palm during a stroke', () => {
    const r = recorder();
    r.begin(touchAt(PAD_X, PAD_Y, 50, 100, { identifier: 7 }));
    const palm = touchAt(PAD_X, PAD_Y, 300, 200, { identifier: 9 });
    const finger = touchAt(PAD_X, PAD_Y, 55, 103, { identifier: 7 });
    // React Native reports the palm as the event touch, with both fingers listed.
    r.move({ ...palm, touches: [palm, finger] });
    expect(r.currentPoints()).toEqual([
      { x: 50, y: 100 },
      { x: 55, y: 103 },
    ]);
    r.move(palm);
    expect(r.currentPoints()).toHaveLength(2);
  });

  it('keeps lines inside the box when the finger slides past the edge', () => {
    const r = recorder();
    r.begin(touchAt(PAD_X, PAD_Y, 330, 210));
    r.move(touchAt(PAD_X, PAD_Y, 360, 260));
    expect(r.currentPoints().at(-1)).toEqual({ x: 340, y: 220 });
  });

  it('skips sub-pixel jitter but not real movement', () => {
    const r = recorder();
    r.begin(touchAt(PAD_X, PAD_Y, 50, 50));
    expect(r.move(touchAt(PAD_X, PAD_Y, 50.2, 50.1))).toBe(false);
    expect(r.move(touchAt(PAD_X, PAD_Y, 52, 50))).toBe(true);
  });

  it('a movement with no finger down draws nothing', () => {
    const r = recorder();
    expect(r.move(touchAt(PAD_X, PAD_Y, 10, 10))).toBe(false);
    expect(r.end()).toBe('');
  });

  it('still reads signatures saved by version 1.1', () => {
    const old = ['M10 80 L60 30 L110 90', 'M200 70 l0.1 0'];
    expect(old.every(isSafePath)).toBe(true);
    expect(inkBox(old, 340, 220)).toEqual({ x: 2, y: 22, width: 206, height: 76 });
    expect(hasInk(old)).toBe(true);
    expect(pointsToPath([])).toBe('');
  });
});
