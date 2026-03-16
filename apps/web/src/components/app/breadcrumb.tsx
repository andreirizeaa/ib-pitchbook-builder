'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  onNavigate?: (href: string) => void;
}

export function Breadcrumb({ items, onNavigate }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-1.5 text-sm">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />}
            {isLast || !item.href ? (
              <span
                className={isLast ? 'font-semibold' : 'text-gray-500'}
                style={isLast ? { color: 'var(--foreground)' } : undefined}
              >
                {item.label}
              </span>
            ) : onNavigate ? (
              <button
                onClick={() => onNavigate(item.href!)}
                className="text-gray-500 hover:text-[var(--primary)] hover:underline underline-offset-2 transition-colors rounded px-1 -mx-1 py-0.5"
              >
                {item.label}
              </button>
            ) : (
              <Link
                href={item.href}
                className="text-gray-500 hover:text-[var(--primary)] hover:underline underline-offset-2 transition-colors rounded px-1 -mx-1 py-0.5"
              >
                {item.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
