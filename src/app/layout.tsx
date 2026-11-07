import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Store-Inv | Store Inventory Audit & Auto Replenishment',
  description: 'Real-time field inventory audit and automated WMS replenishment ordering system for Food Depot and retail chains',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-100 text-gray-900 antialiased min-h-screen selection:bg-amber-300">
        {children}
      </body>
    </html>
  );
}
