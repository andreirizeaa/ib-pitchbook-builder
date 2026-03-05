'use client';

import { Menu, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/providers/auth-provider';

interface AppHeaderProps {
  onToggleSidebar: () => void;
}

export function AppHeader({ onToggleSidebar }: AppHeaderProps) {
  const { user, signOut } = useAuth();

  return (
    <header className="h-16 bg-white border-b flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <button onClick={onToggleSidebar} className="text-gray-500 hover:text-gray-700 lg:hidden">
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900">PitchDeck AI</h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="w-8 h-8 bg-[#003366] rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <span className="hidden md:inline">{user?.email}</span>
        </div>
        <Button variant="ghost" size="icon" onClick={signOut} title="Sign out">
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
}
