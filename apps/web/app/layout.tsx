import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CashBudget',
  description: 'Track Apple Cash spending and future planned expenses'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'Arial, sans-serif', margin: 0, background: '#f6f7fb' }}>
        {children}
      </body>
    </html>
  );
}
