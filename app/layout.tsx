import './globals.css';
import React from 'react';

export const metadata = {
  title: 'Sefalana Portal',
  description: 'Store locator, weekly specials, and supplier portal demo for Sefalana'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
