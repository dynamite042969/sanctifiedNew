'use client';

import * as React from 'react';
import { type ReactNode } from 'react';
import { Box, CssBaseline, Stack, ThemeProvider, createTheme } from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter';

// ✅ MUI X date pickers localization provider
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { ThemeToggleContext } from '../components/ThemeToggleContext';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function ClientLayout({ children }: { children: ReactNode }) {
  // Respect system theme
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const [mode, setMode] = React.useState<'light' | 'dark'>('light');
  const [userHasToggled, setUserHasToggled] = React.useState(false);

  React.useEffect(() => {
    // Respect system preference until the user manually toggles
    if (!userHasToggled) {
      setMode(prefersDarkMode ? 'dark' : 'light');
    }
  }, [prefersDarkMode, userHasToggled]);

  const themeToggle = React.useMemo(
    () => ({
      toggleColorMode: () => {
        setUserHasToggled(true);
        setMode((prev) => (prev === 'light' ? 'dark' : 'light'));
      },
    }),
    [],
  );

  const theme = React.useMemo(
    () =>
      createTheme({
        palette: { mode },
        components: {
          MuiContainer: { defaultProps: { maxWidth: 'lg' } },
        },
      }),
    [mode],
  );

  return (
    <ThemeToggleContext.Provider value={themeToggle}>
      <AppRouterCacheProvider options={{ key: 'mui' }}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Stack minHeight="100dvh">
              <Header />
              <Box
                component="main"
                sx={{
                  flex: 1,
                  py: { xs: 4, md: 6 },
                  background:
                    'radial-gradient(1200px 500px at 10% -10%, rgba(25,118,210,.08), transparent), radial-gradient(900px 400px at 110% 10%, rgba(25,118,210,.06), transparent)',
                }}
              >
                {children}
              </Box>
              <Footer />
            </Stack>
          </LocalizationProvider>
        </ThemeProvider>
      </AppRouterCacheProvider>
    </ThemeToggleContext.Provider>
  );
}
