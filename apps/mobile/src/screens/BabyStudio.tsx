import * as React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useTheme, type Theme } from './ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'BabyStudio'>;

export default function BabyStudioScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  return (
    <View style={[styles.wrap, { backgroundColor: theme.background }]}>
      <Text style={styles.h1}>Baby Studio</Text>
      <Text style={styles.muted}>Manage enquiries and active customers.</Text>

      <View style={styles.row}>
        <Pressable style={[styles.btn, styles.primary]} onPress={() => navigation.navigate('Enquiry')}>
          <Text style={styles.btnText}>Customer Enquiry</Text>
        </Pressable>

        <Pressable style={[styles.btn, styles.outlined]} onPress={() => navigation.navigate('ActiveCustomers')}>
          <Text style={[styles.btnText, styles.primaryText]}>Active Customers</Text>
        </Pressable>
      </View>
    </View>
  );
}

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    wrap: { flex: 1, padding: 20, gap: 10 },
    h1: { fontSize: 24, fontWeight: '800', color: theme.text },
    muted: { color: theme.muted },
    row: { flexDirection: 'row', gap: 12, marginTop: 16, flexWrap: 'wrap' },
    btn: {
      borderRadius: 12,
      paddingVertical: 16,
      paddingHorizontal: 18,
      minWidth: '47%',
      alignItems: 'center',
    },
    primary: { backgroundColor: theme.primary },
    outlined: { borderWidth: 2, borderColor: theme.primary },
    btnText: { fontWeight: '700', color: theme.primaryText },
    primaryText: { color: theme.primary },
  });
