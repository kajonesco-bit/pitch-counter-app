import { useState } from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { Text } from 'react-native';
import { Path } from 'react-native-svg';

import SignaturePad, { SignatureDrawing } from '../src/components/SignaturePad';
import { buildGameHtml } from '../src/pdf/buildGameHtml';
import { gameStatus, updatePitcher } from '../src/model/game';
import { hasInk, TouchSample } from '../src/model/signature';
import { handwritingStroke, touchAt } from './gestures';
import { sampleGame, storeWithMemory } from './helpers';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const PAD_X = 16;
const PAD_Y = 310;

let latest: SignatureDrawing = { strokes: [], width: 0, height: 0 };
let signingLog: boolean[] = [];
let clear: () => void = () => {};

/** Same wiring as the signing screen: the screen holds the strokes; Clear empties them. */
function Harness() {
  const [drawing, setDrawing] = useState<SignatureDrawing>({ strokes: [], width: 0, height: 0 });
  latest = drawing;
  clear = () => setDrawing({ strokes: [], width: 0, height: 0 });
  return (
    <SignaturePad strokes={drawing.strokes} onChange={setDrawing} onSigningChange={(on) => signingLog.push(on)} />
  );
}

function setup() {
  signingLog = [];
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(<Harness />);
  });
  const surface = () => tree.root.findByProps({ accessibilityLabel: 'Signature box. Sign with your finger.' });
  act(() => surface().props.onLayout({ nativeEvent: { layout: { x: 0, y: 0, width: 340, height: 220 } } }));
  const ev = (t: TouchSample) => ({ nativeEvent: t });

  function stroke(points: { x: number; y: number }[], { lift = true, offset }: { lift?: boolean; offset?: { x: number; y: number } } = {}) {
    act(() => {
      surface().props.onResponderGrant(ev(touchAt(PAD_X, PAD_Y, points[0].x, points[0].y)));
    });
    for (const p of points.slice(1)) {
      act(() => surface().props.onResponderMove(ev(touchAt(PAD_X, PAD_Y, p.x, p.y, { locationOffset: offset }))));
    }
    if (lift) act(() => surface().props.onResponderRelease(ev(touchAt(PAD_X, PAD_Y, 0, 0))));
  }
  const paths = () => tree.root.findAllByType(Path).map((p) => p.props.d as string);
  const hint = () => tree.root.findAllByType(Text).some((t) => t.props.children === 'Sign here with your finger');
  return { tree, surface, stroke, paths, hint };
}

describe('signature pad (component)', () => {
  it('holds on to the touch: other gestures may not take it over mid-stroke', () => {
    const { surface } = setup();
    expect(surface().props.onResponderTerminationRequest()).toBe(false);
    expect(surface().props.onStartShouldSetResponder()).toBe(true);
    expect(surface().props.onMoveShouldSetResponder()).toBe(true);
  });

  it('tells the screen to stop scrolling while a finger is down, and to resume after', () => {
    const { stroke, surface } = setup();
    stroke(handwritingStroke(20, 110, 30), { lift: false });
    expect(signingLog).toEqual([true]);
    act(() => surface().props.onResponderRelease({ nativeEvent: touchAt(PAD_X, PAD_Y, 0, 0) }));
    expect(signingLog).toEqual([true, false]);
    stroke(handwritingStroke(20, 110, 10), { lift: false });
    act(() => surface().props.onResponderTerminate({ nativeEvent: touchAt(PAD_X, PAD_Y, 0, 0) }));
    expect(signingLog).toEqual([true, false, true, false]); // an interrupted touch also unlocks scrolling
  });

  it('shows the line live while the finger moves, as one growing stroke', () => {
    const { stroke, paths, hint } = setup();
    expect(hint()).toBe(true);
    stroke(handwritingStroke(20, 110, 40), { lift: false });
    expect(hint()).toBe(false);
    const live = paths();
    expect(live).toHaveLength(1);
    expect(live[0].match(/M/g)).toHaveLength(1);
    expect(latest.strokes).toHaveLength(0); // not saved until the finger lifts
  });

  it('a continuous gesture becomes one saved stroke; each new touch adds a separate stroke', () => {
    const { stroke, paths } = setup();
    stroke(handwritingStroke(20, 110, 60));
    expect(latest.strokes).toHaveLength(1);
    stroke(handwritingStroke(120, 120, 40));
    stroke([{ x: 300, y: 60 }]); // dot
    expect(latest.strokes).toHaveLength(3);
    expect(latest.width).toBe(340);
    expect(latest.height).toBe(220);
    expect(paths()).toEqual(latest.strokes);
    expect(latest.strokes[1].startsWith('M120 ')).toBe(true);
  });

  it('draws in the right place even if locationX/Y come from another element', () => {
    const skewed = setup();
    skewed.stroke(handwritingStroke(20, 110, 20), { offset: { x: 160, y: 90 } });
    const withOffset = latest.strokes;
    const clean = setup();
    clean.stroke(handwritingStroke(20, 110, 20));
    expect(withOffset).toHaveLength(1);
    expect(withOffset).toEqual(latest.strokes);
  });

  it('if iOS interrupts a touch, the part already drawn is kept', () => {
    const { stroke, surface } = setup();
    stroke(handwritingStroke(20, 110, 25), { lift: false });
    act(() => surface().props.onResponderTerminate({ nativeEvent: touchAt(PAD_X, PAD_Y, 0, 0) }));
    expect(latest.strokes).toHaveLength(1);
    expect(latest.strokes[0].match(/Q/g)).toHaveLength(23);
  });

  it('Clear removes every stroke and brings the hint back', () => {
    const { stroke, paths, hint } = setup();
    stroke(handwritingStroke(20, 110, 30));
    stroke(handwritingStroke(140, 110, 30));
    expect(hasInk(latest.strokes)).toBe(true);
    act(() => clear());
    expect(latest.strokes).toEqual([]);
    expect(hasInk(latest.strokes)).toBe(false);
    expect(paths()).toEqual([]);
    expect(hint()).toBe(true);
    stroke(handwritingStroke(30, 100, 20));
    expect(latest.strokes).toHaveLength(1); // drawing again after Clear starts fresh
  });

  it('strokes drawn on the pad go into the PDF exactly, and editing the game still removes them', () => {
    const { stroke } = setup();
    stroke(handwritingStroke(20, 110, 60));
    stroke(handwritingStroke(130, 120, 50));
    const visitor = { ...latest, coachName: 'Pat Morrison' };
    stroke(handwritingStroke(40, 90, 45));
    const home = { coachName: 'Sam Delgado', strokes: latest.strokes.slice(2), width: 340, height: 220 };

    const { store } = storeWithMemory([sampleGame()]);
    const id = Object.keys(store.getGames())[0];
    store.signGame(id, 'visitor', visitor);
    store.signGame(id, 'home', home);
    const html = buildGameHtml(store.getGame(id)!);
    for (const d of [...visitor.strokes, ...home.strokes]) expect(html).toContain(`<path d="${d}" />`);
    expect((html.match(/<path /g) ?? []).length).toBe(3);

    store.updateGame(id, (g) => updatePitcher(g, 'home', g.home.pitchers[0].id, (p) => ({ ...p, pitches: p.pitches + 1 })));
    expect(gameStatus(store.getGame(id)!)).toBe('draft');
    expect(buildGameHtml(store.getGame(id)!)).not.toContain('<path ');
  });
});
