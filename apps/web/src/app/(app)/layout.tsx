'use client';

import { AuthProvider } from '@/providers/auth-provider';
import { AppSidebar } from '@/components/app/app-sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-[var(--background)]">
        <AppSidebar />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </AuthProvider>
  );
}
