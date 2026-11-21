import { TouchSample } from '../src/model/signature';

/**
 * Builds realistic finger-touch samples for a pad whose top-left corner sits
 * at (padX, padY) on the screen. `locationOffset` simulates iPhone reporting
 * locationX/locationY relative to some other element than the pad.
 */
export function touchAt(
  padX: number,
  padY: number,
  x: number,
  y: number,
  options: { identifier?: number; locationOffset?: { x: number; y: number }; touches?: TouchSample[] } = {}
): TouchSample {
  const offset = options.locationOffset ?? { x: 0, y: 0 };
  return {
    identifier: options.identifier ?? 1,
    pageX: padX + x,
    pageY: padY + y,
    locationX: x - offset.x,
    locationY: y - offset.y,
    touches: options.touches,
  };
}

/** A continuous handwriting-like stroke: a looping wave sampled like a 60 Hz touchscreen. */
export function handwritingStroke(startX: number, baseY: number, samples = 60): { x: number; y: number }[] {
  const points = [];
  for (let i = 0; i < samples; i++) {
    points.push({ x: startX + i * 3.2, y: baseY + Math.sin(i / 3) * 28 + Math.cos(i / 7) * 9 });
  }
  return points;
}

/** Absolute coordinates in a saved path (M, L, Q). */
export function pathNumbers(d: string): number[] {
  return (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
}
