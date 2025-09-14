import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './Home';
import BabyStudioScreen from './BabyStudio';
import EnquiryScreen from './Enquiry';
import ActiveCustomersScreen from './ActiveCustomers';
import { useTheme } from './ThemeContext';

export type RootStackParamList = {
  Home: undefined;
  BabyStudio: undefined;
  Enquiry: undefined;
  ActiveCustomers: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { theme } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.background,
        },
        headerTintColor: theme.text,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Sanctified Studios' }} />
      <Stack.Screen name="BabyStudio" component={BabyStudioScreen} options={{ title: 'Baby Studio' }} />
      <Stack.Screen name="Enquiry" component={EnquiryScreen} options={{ title: 'Customer Enquiry' }} />
      <Stack.Screen
        name="ActiveCustomers"
        component={ActiveCustomersScreen}
        options={{ title: 'Active Customers' }}
      />
    </Stack.Navigator>
  );
}
