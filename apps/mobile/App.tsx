import * as React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import HomeScreen from './src/screens/Home';
import BabyStudioScreen from './src/screens/BabyStudio';
import EnquiryScreen from './src/screens/Enquiry';
import ActiveCustomersScreen from './src/screens/ActiveCustomers';
import { ThemeProvider, useTheme } from './src/screens/ThemeContext';

export type RootStackParamList = {
  Home: undefined;
  BabyStudio: undefined;
  Enquiry: undefined;
  ActiveCustomers: undefined;
  Dashboard: undefined; // placeholder
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function HeaderRight({ navigation }: any) {
  const { theme } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <Pressable onPress={() => navigation.navigate('Home')}>
        <Text style={[styles.headerBtn, { color: theme.text, borderColor: theme.text }]}>Home</Text>
      </Pressable>
      <Pressable onPress={() => navigation.navigate('Dashboard')}>
        <Text style={[styles.headerBtn, { color: theme.text, borderColor: theme.text }]}>Dashboard</Text>
      </Pressable>
    </View>
  );
}

function PlaceholderDashboard() {
  const { theme } = useTheme();
  return (
    <View style={[styles.center, { backgroundColor: theme.background }]}>
      <Text style={[styles.h3, { color: theme.text }]}>Dashboard</Text>
      <Text style={[styles.muted, { color: theme.muted }]}>Coming soon…</Text>
    </View>
  );
}

function AppContent() {
  const { theme, isDark } = useTheme();

  const navTheme = {
    ...DefaultTheme,
    dark: isDark,
    colors: {
      ...DefaultTheme.colors,
      background: theme.background,
      card: theme.card,
      text: theme.text,
      primary: theme.primary,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={({ navigation }) => ({
          headerRight: () => <HeaderRight navigation={navigation} />,
          headerTitleStyle: { fontWeight: '700' },
          headerStyle: {
            backgroundColor: theme.card,
          },
          headerTintColor: theme.text,
        })}
      >
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Sanctified Studios' }} />
        <Stack.Screen name="BabyStudio" component={BabyStudioScreen} options={{ title: 'Baby Studio' }} />
        <Stack.Screen name="Enquiry" component={EnquiryScreen} options={{ title: 'Customer Enquiry' }} />
        <Stack.Screen
          name="ActiveCustomers"
          component={ActiveCustomersScreen}
          options={{ title: 'Active Customers' }}
        />
        <Stack.Screen name="Dashboard" component={PlaceholderDashboard} />
      </Stack.Navigator>

      {/* Simple Footer */}
      <View style={[styles.footer, { backgroundColor: theme.card, borderTopColor: theme.inputBorder }]}>
        <Text style={[styles.footerText, { color: theme.muted }]}>© {new Date().getFullYear()} Sanctified Studios</Text>
      </View>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  headerBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderRadius: 8,
    fontWeight: '600',
  },
  footer: {
    borderTopWidth: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  footerText: {},
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  h3: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  muted: {},
});