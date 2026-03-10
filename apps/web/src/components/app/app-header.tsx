'use client';

import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/providers/auth-provider';

export function AppHeader() {
  const { signOut } = useAuth();

  return (
    <header className="h-16 bg-white dark:bg-[var(--card)] border-b flex items-center justify-between px-6">
      <h1 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>PitchDeck AI</h1>
      <Button variant="ghost" size="icon" onClick={signOut} title="Sign out">
        <LogOut className="w-4 h-4" />
      </Button>
    </header>
  );
}
