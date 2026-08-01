import type { Metadata } from 'next';
import './globals.css';
import SupabaseProvider from '../components/SupabaseProvider';
import ReactQueryProvider from '../components/ReactQueryProvider';
import { ErrorBoundary } from '../components/ErrorBoundary';
import PreferenceHydrator from '../components/PreferenceHydrator';

export const metadata: Metadata = {
  title: 'Vador OS - Premium Restaurant Operating System',
  description: 'Production-ready enterprise workspace dashboard by Jules Architect.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        <ErrorBoundary>
          <SupabaseProvider>
            <ReactQueryProvider>
              <PreferenceHydrator />
              {children}
            </ReactQueryProvider>
          </SupabaseProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
