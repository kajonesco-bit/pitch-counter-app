import { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { statusLabel } from '../model/game';
import { GameStatus } from '../model/types';

export const colors = {
  background: '#f2f3f5',
  card: '#fff',
  text: '#111',
  muted: '#555',
  border: '#c9ccd1',
  placeholder: '#9aa0a6',
  blue: '#0a5cc2',
  red: '#b3261e',
  green: '#1b7f3b',
  amber: '#9a6700',
};

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  busy?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ title, onPress, variant = 'primary', disabled, busy, style }: ButtonProps) {
  const off = disabled || busy;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off }}
      onPress={onPress}
      disabled={off}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'danger' && styles.danger,
        pressed && styles.pressed,
        off && styles.faded,
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : colors.blue} />
      ) : (
        <Text
          style={[
            styles.buttonText,
            variant !== 'primary' && { color: variant === 'danger' ? colors.red : colors.blue },
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const badgeColors: Record<GameStatus, string> = {
  draft: colors.muted,
  'partly-signed': colors.amber,
  signed: colors.green,
};

export function StatusBadge({ status }: { status: GameStatus }) {
  const color = badgeColors[status];
  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <Text style={[styles.badgeText, { color }]}>{statusLabel(status)}</Text>
    </View>
  );
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 48, gap: 16 },
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 14, gap: 10 },
  cardTitle: { fontSize: 18, fontWeight: '600', color: colors.text },
  fieldLabel: { fontSize: 13, color: colors.muted, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 17,
    color: colors.text,
    backgroundColor: '#fff',
  },
  readOnlyInput: { backgroundColor: '#f6f7f8', color: colors.muted },
  body: { fontSize: 16, color: colors.text },
  muted: { fontSize: 14, color: colors.muted },
  link: { fontSize: 17, color: colors.blue },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  button: {
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  primary: { backgroundColor: colors.blue },
  secondary: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.blue },
  danger: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.red },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600', textAlign: 'center' },
  pressed: { opacity: 0.7 },
  faded: { opacity: 0.35 },
  badge: {
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 13, fontWeight: '700' },
  notice: {
    borderRadius: 12,
    padding: 14,
    gap: 8,
    backgroundColor: '#fff7e0',
    borderWidth: 1,
    borderColor: '#f0d58a',
  },
  noticeText: { fontSize: 15, color: '#5c4400' },
});
