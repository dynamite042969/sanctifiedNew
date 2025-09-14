import type { Metadata } from 'next';
import ClientLayout from './ClientLayout';
import Logo from '../assets/logo.png';

export const metadata: Metadata = {
  title: 'Sanctified Studios',
  icons: {
    icon: Logo.src,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
