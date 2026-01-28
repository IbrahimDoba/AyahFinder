import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AyahFind API Server',
  description: 'Backend API for AyahFind mobile application',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
