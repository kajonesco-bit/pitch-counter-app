import { useRef, useState } from 'react';
import { GestureResponderEvent, LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';

import { Point, pointsToPath } from '../model/signature';
import { colors } from './ui';

export type SignatureDrawing = { strokes: string[]; width: number; height: number };

type Props = {
  strokes: string[];
  onChange: (drawing: SignatureDrawing) => void;
};

/** A white box the coach signs in with a finger. Each finger stroke is kept as an SVG path. */
export default function SignaturePad({ strokes, onChange }: Props) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [current, setCurrent] = useState<Point[]>([]);
  const points = useRef<Point[]>([]);

  function pointFrom(event: GestureResponderEvent): Point {
    const { locationX, locationY } = event.nativeEvent;
    return {
      x: Math.min(size.width, Math.max(0, locationX)),
      y: Math.min(size.height, Math.max(0, locationY)),
    };
  }

  function start(event: GestureResponderEvent) {
    points.current = [pointFrom(event)];
    setCurrent(points.current);
  }

  function move(event: GestureResponderEvent) {
    points.current = [...points.current, pointFrom(event)];
    setCurrent(points.current);
  }

  function finish() {
    const path = pointsToPath(points.current);
    points.current = [];
    setCurrent([]);
    if (path) onChange({ strokes: [...strokes, path], width: size.width, height: size.height });
  }

  function onLayout(event: LayoutChangeEvent) {
    const { width, height } = event.nativeEvent.layout;
    setSize({ width, height });
  }

  const empty = strokes.length === 0 && current.length === 0;

  return (
    <View
      style={styles.pad}
      onLayout={onLayout}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={start}
      onResponderMove={move}
      onResponderRelease={finish}
      onResponderTerminate={finish}
      accessibilityLabel="Signature box. Sign with your finger."
    >
      {empty ? (
        <Text style={styles.hint} pointerEvents="none">
          Sign here with your finger
        </Text>
      ) : null}
      <View style={styles.line} pointerEvents="none" />
      {size.width > 0 ? (
        <Svg width={size.width} height={size.height} style={StyleSheet.absoluteFill} pointerEvents="none">
          <G fill="none" stroke={colors.text} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
            {strokes.map((d, i) => (
              <Path key={i} d={d} />
            ))}
            {current.length > 0 ? <Path d={pointsToPath(current)} /> : null}
          </G>
        </Svg>
      ) : null}
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
