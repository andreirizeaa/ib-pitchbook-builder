import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import NextTopLoader from 'nextjs-toploader';
import { ThemeProvider } from '@/providers/theme-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'PitchDeck AI — Investment Banking Pitch Book Generator',
  description: 'AI-powered pitch book generation system for investment banking professionals',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider>
          <NextTopLoader color="#003366" showSpinner={false} />
          {children}
          <Toaster position="top-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
