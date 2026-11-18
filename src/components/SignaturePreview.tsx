import { StyleSheet, View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';

import { isSafePath, viewBoxFor } from '../model/signature';
import { Signature } from '../model/types';
import { colors } from './ui';

/** Shows a saved signature, scaled down to fit. */
export default function SignaturePreview({ signature, height = 70 }: { signature: Signature; height?: number }) {
  return (
    <View style={[styles.box, { height }]}>
      <Svg
        width="100%"
        height="100%"
        viewBox={viewBoxFor(signature.strokes, signature.width, signature.height)}
        preserveAspectRatio="xMinYMax meet"
      >
        <G fill="none" stroke={colors.text} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
          {signature.strokes.filter(isSafePath).map((d, i) => (
            <Path key={i} d={d} />
          ))}
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderBottomWidth: 1, borderColor: colors.text },
});
