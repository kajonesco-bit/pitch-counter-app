import { memo, useRef, useState } from 'react';
import { GestureResponderEvent, Keyboard, LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';

import { createStrokeRecorder, StrokeRecorder } from '../model/signature';
import { colors } from './ui';

export type SignatureDrawing = { strokes: string[]; width: number; height: number };

type Props = {
  strokes: string[];
  onChange: (drawing: SignatureDrawing) => void;
};

const INK = { fill: 'none', stroke: colors.text, strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

/** Finished strokes only redraw when a stroke is added or cleared, not on every finger movement. */
const FinishedStrokes = memo(function FinishedStrokes({ strokes }: { strokes: string[] }) {
  return (
    <G {...INK}>
      {strokes.map((d, i) => (
        <Path key={i} d={d} />
      ))}
    </G>
  );
});

/**
 * A white box the coach signs in with a finger. Each finger stroke is kept as an SVG path.
 *
 * The touch surface is a separate, empty layer on top of the drawing, so the
 * finger always lands on the same element (never on the hint text or on ink
 * already drawn).
 */
export default function SignaturePad({ strokes, onChange }: Props) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [currentPath, setCurrentPath] = useState('');
  const recorder = useRef<StrokeRecorder | null>(null);

  function rec(): StrokeRecorder {
    if (!recorder.current) recorder.current = createStrokeRecorder();
    return recorder.current;
  }

  function start(event: GestureResponderEvent) {
    Keyboard.dismiss();
    rec().begin(event.nativeEvent);
    setCurrentPath(rec().currentPath());
  }

  function move(event: GestureResponderEvent) {
    if (rec().move(event.nativeEvent)) setCurrentPath(rec().currentPath());
  }

  function finish() {
    const path = rec().end();
    setCurrentPath('');
    if (path) onChange({ strokes: [...strokes, path], width: size.width, height: size.height });
  }

  function onLayout(event: LayoutChangeEvent) {
    const { width, height } = event.nativeEvent.layout;
    rec().setSize(width, height);
    setSize({ width, height });
  }

  const empty = strokes.length === 0 && !currentPath;

  return (
    <View style={styles.pad}>
      {empty ? <Text style={styles.hint}>Sign here with your finger</Text> : null}
      <View style={styles.line} />
      {size.width > 0 ? (
        <Svg width={size.width} height={size.height} style={StyleSheet.absoluteFill}>
          <FinishedStrokes strokes={strokes} />
          {currentPath ? <Path d={currentPath} {...INK} /> : null}
        </Svg>
      ) : null}
      <View
        style={StyleSheet.absoluteFill}
        collapsable={false}
        onLayout={onLayout}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={(event) => {
          start(event);
          return true; // ask native views not to take this touch
        }}
        onResponderMove={move}
        onResponderRelease={finish}
        onResponderTerminate={finish}
        accessible
        accessibilityLabel="Signature box. Sign with your finger."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  pad: {
    height: 220,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hint: { fontSize: 17, color: colors.placeholder },
  line: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 50,
    borderBottomWidth: 1,
    borderColor: '#d6d8dc',
  },
});
