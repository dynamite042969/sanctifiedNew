import * as React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';

export type HelloProps = {
  label: string;
  onPress?: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
};

export function Hello({ label, onPress, style, textStyle }: HelloProps) {
  return (
    <Pressable onPress={onPress} style={[styles.btn, style]}>
      <Text style={[styles.text, textStyle]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: '#1976d2',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: 'center',
  },
  text: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});
