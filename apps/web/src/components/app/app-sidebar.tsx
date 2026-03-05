'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  FileText, Home, Plus, Settings, FolderOpen,
  ChevronLeft, ChevronRight, LayoutTemplate,
} from 'lucide-react';

interface AppSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const navItems = [
  { href: '/dashboard', icon: Home, label: 'Dashboard' },
  { href: '/pitchbooks', icon: FolderOpen, label: 'Pitch Books' },
  { href: '/pitchbooks/new', icon: Plus, label: 'New Pitch Book' },
  { href: '/templates', icon: LayoutTemplate, label: 'Templates' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

export function AppSidebar({ isOpen, onToggle }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'flex flex-col bg-white border-r transition-all duration-200 ease-in-out',
        isOpen ? 'w-56' : 'w-16'
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center gap-2 px-4 border-b">
        <div className="w-8 h-8 bg-[#003366] rounded-lg flex items-center justify-center flex-shrink-0">
          <FileText className="w-5 h-5 text-white" />
        </div>
        {isOpen && <span className="text-lg font-bold text-[#003366]">PitchDeck AI</span>}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-1 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-[#003366] text-white'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {isOpen && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="p-2 border-t">
        <button
          onClick={onToggle}
          className="flex items-center justify-center w-full py-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          {isOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>
      </div>
    </aside>
  );
}
