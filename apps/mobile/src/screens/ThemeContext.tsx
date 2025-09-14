import React, { createContext, useContext, useState } from 'react';
import { useColorScheme } from 'react-native';

export type Theme = {
  background: string;
  card: string;
  text: string;
  muted: string;
  primary: string;
  primaryText: string;
  input: string;
  inputBorder: string;
  backdrop: string;
  sheet: string;
  sheetButton: string;
  sheetButtonText: string;
  sheetCancel: string;
  sheetCancelText: string;
  dangerBg: string;
  statusEnquiryBg: string;
  statusEnquiryText: string;
  statusActiveBg: string;
  statusActiveText: string;
  statusDoneBg: string;
  statusDoneText: string;
};

const lightTheme: Theme = {
  background: '#f0f0f0',
  card: '#ffffff',
  text: '#000000',
  muted: '#6c757d',
  primary: '#007bff',
  primaryText: '#ffffff',
  input: '#ffffff',
  inputBorder: '#ced4da',
  backdrop: 'rgba(0, 0, 0, 0.5)',
  sheet: '#ffffff',
  sheetButton: '#f0f0f0',
  sheetButtonText: '#000000',
  sheetCancel: '#ffffff',
  sheetCancelText: '#007bff',
  dangerBg: '#f8d7da',
  statusEnquiryBg: '#fff3cd',
  statusEnquiryText: '#856404',
  statusActiveBg: '#d4edda',
  statusActiveText: '#155724',
  statusDoneBg: '#d1ecf1',
  statusDoneText: '#0c5460',
};

const darkTheme: Theme = {
  background: '#121212',
  card: '#1e1e1e',
  text: '#ffffff',
  muted: '#adb5bd',
  primary: '#007bff',
  primaryText: '#ffffff',
  input: '#2c2c2c',
  inputBorder: '#444444',
  backdrop: 'rgba(0, 0, 0, 0.5)',
  sheet: '#1e1e1e',
  sheetButton: '#2c2c2c',
  sheetButtonText: '#ffffff',
  sheetCancel: '#1e1e1e',
  sheetCancelText: '#007bff',
  dangerBg: '#582a2e',
  statusEnquiryBg: '#544b25',
  statusEnquiryText: '#f0e68c',
  statusActiveBg: '#2a4b32',
  statusActiveText: '#a9dfbf',
  statusDoneBg: '#25464d',
  statusDoneText: '#a9d5e0',
};

type ThemeContextType = {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const colorScheme = useColorScheme();
  const [isDark, setIsDark] = useState(colorScheme === 'dark');

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
