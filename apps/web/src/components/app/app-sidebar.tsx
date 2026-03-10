'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { FileText, Home, Plus, FolderOpen, LayoutTemplate, Sun, Moon, Monitor, ChevronDown, User, LogOut } from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';

const navItems = [
  { href: '/dashboard', icon: Home, label: 'Dashboard' },
  { href: '/pitchbooks', icon: FolderOpen, label: 'Pitch Books' },
  { href: '/pitchbooks/new', icon: Plus, label: 'New Pitch Book' },
  { href: '/templates', icon: LayoutTemplate, label: 'Templates' },
];

const themeOptions = [
  { value: 'light' as const, label: 'Light', icon: Sun },
  { value: 'dark' as const, label: 'Dark', icon: Moon },
  { value: 'system' as const, label: 'System', icon: Monitor },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [themeOpen, setThemeOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentTheme = themeOptions.find((o) => o.value === theme) || themeOptions[0];
  const CurrentIcon = currentTheme.icon;

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setThemeOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <aside className="flex flex-col w-64 border-r" style={{ color: 'var(--foreground)', backgroundColor: 'var(--sidebar)' }}>
      {/* Logo */}
      <div className="h-16 flex items-center gap-2 px-4 border-b">
        <div className="w-8 h-8 bg-[var(--primary)] rounded-lg flex items-center justify-center flex-shrink-0">
          <FileText className="w-5 h-5 text-white dark:text-[var(--primary-foreground)]" />
        </div>
        <span className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>PitchDeck AI</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-1 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (
            item.href === '/pitchbooks'
              ? pathname?.startsWith('/pitchbooks/') && !pathname?.startsWith('/pitchbooks/new')
              : item.href !== '/dashboard' && pathname?.startsWith(item.href)
          );
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-[var(--primary)] text-white dark:text-[var(--primary-foreground)]'
                  : 'sidebar-item'
              )}
              style={isActive ? undefined : { color: 'var(--foreground)' }}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Theme dropdown */}
      <div className="px-3 pb-3 relative" ref={dropdownRef}>
        <button
          onClick={() => setThemeOpen(!themeOpen)}
          className="flex items-center justify-between w-full px-3 py-2 rounded-lg border text-sm font-medium sidebar-item transition-colors"
          style={{ color: 'var(--foreground)' }}
        >
          <span className="flex items-center gap-2">
            <CurrentIcon className="w-4 h-4" />
            {currentTheme.label}
          </span>
          <ChevronDown className={cn('w-4 h-4 transition-transform', themeOpen && 'rotate-180')} />
        </button>

        {themeOpen && (
          <div className="absolute bottom-full left-3 right-3 mb-1 border rounded-lg shadow-lg py-1 z-50" style={{ backgroundColor: 'var(--sidebar)' }}>
            {themeOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setTheme(opt.value); setThemeOpen(false); }}
                className={cn(
                  'flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors',
                  theme === opt.value
                    ? 'bg-gray-100 dark:bg-[var(--accent)] font-medium'
                    : 'sidebar-item'
                )}
                style={{ color: 'var(--foreground)' }}
              >
                <opt.icon className="w-4 h-4" />
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Divider + User email card */}
      <div className="border-t px-3 py-3">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2.5 border rounded-lg sidebar-item transition-colors cursor-pointer"
        >
          <div className="w-8 h-8 bg-[var(--primary)] rounded-full flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-white dark:text-[var(--primary-foreground)]" />
          </div>
          <span className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>
            {user?.email || 'Account'}
          </span>
        </Link>
        <button
          onClick={signOut}
          className="flex items-center gap-3 w-full px-3 py-2.5 mt-2 rounded-lg text-sm font-medium sidebar-item transition-colors"
          style={{ color: 'var(--foreground)' }}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
