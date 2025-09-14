import * as React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Image } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useTheme, type Theme } from './ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  return (
    <ScrollView contentContainerStyle={[styles.wrap, { backgroundColor: theme.background }]}>
      
      <Image
        source={require('../../assets/logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.title}>Sanctified Studios</Text>
      <Text style={styles.subtitle}>Choose a module to continue</Text>

      <View style={styles.grid}>
        <Tile label="Baby Studio" onPress={() => navigation.navigate('BabyStudio')} />
        <Tile label="Wedding Studio" onPress={() => { /* TODO */ }} />
        <Tile label="Events" onPress={() => { /* TODO */ }} />
        <Tile label="Team Management" onPress={() => { /* TODO */ }} />
      </View>
    </ScrollView>
  );
}

function Tile({ label, onPress }: { label: string; onPress: () => void }) {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.tile, pressed && { opacity: 0.8 }]}>
      <Text style={styles.tileText}>{label}</Text>
    </Pressable>
  );
}

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    wrap: { padding: 20, gap: 8, flex: 1 },
    title: { fontSize: 28, fontWeight: '800', marginTop: 8, textAlign: 'center', color: theme.text },
    subtitle: { color: theme.muted, marginBottom: 16, textAlign: 'center' },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    tile: {
      backgroundColor: theme.primary,
      borderRadius: 14,
      paddingVertical: 20,
      paddingHorizontal: 16,
      minWidth: '47%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    tileText: { color: theme.primaryText, fontWeight: '700', fontSize: 16 },
    logo: {
      width: 120,
      height: 120,
      alignSelf: 'center',
      marginBottom: 16,
    },
  });
