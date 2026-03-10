'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';

interface TickerResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
}

interface TickerSearchProps {
  value: string;
  onChange: (ticker: string) => void;
  onCompanySelect?: (companyName: string) => void;
}

export function TickerSearch({ value, onChange, onCompanySelect }: TickerSearchProps) {
  const { session } = useAuth();
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<TickerResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery);
    onChange(searchQuery.toUpperCase());

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (searchQuery.length < 1) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await apiClient<any>(`/api/companies/search?q=${encodeURIComponent(searchQuery)}`, {
          token: session?.access_token,
        });
        setResults(res.data || []);
        setIsOpen(true);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 500);
  };

  const handleSelect = (ticker: TickerResult) => {
    setQuery(ticker.symbol);
    onChange(ticker.symbol);
    onCompanySelect?.(ticker.name);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search ticker or company name..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => { if (results.length > 0) setIsOpen(true); }}
          className="w-full h-12 pl-10 pr-10 rounded-md border border-[var(--input)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          style={{ color: 'var(--foreground)' }}
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute z-50 top-full mt-1 w-full bg-white dark:bg-[var(--card)] border rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {results.map((r) => (
            <button
              key={r.symbol}
              type="button"
              onClick={() => handleSelect(r)}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-[var(--accent)] transition-colors border-b last:border-b-0 border-gray-100 dark:border-gray-800"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>{r.symbol}</span>
                  <span className="text-xs text-gray-500 ml-2">{r.exchange}</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 truncate mt-0.5">{r.name}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
