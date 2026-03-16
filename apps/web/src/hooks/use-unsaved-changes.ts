'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Hook that warns the user when navigating away with unsaved changes.
 * Works with both browser navigation (beforeunload) and Next.js App Router
 * client-side navigation (by intercepting link clicks at the document level).
 *
 * @param isDirty - whether there are unsaved changes
 * @param onBlock - called when navigation is blocked; receives the target URL.
 *                  Store it and show a confirmation dialog, then call
 *                  `proceed(url)` if the user confirms.
 * @returns proceed - call with a URL to allow the blocked navigation
 */
export function useUnsavedChanges(
  isDirty: boolean,
  onBlock: (targetUrl: string) => void,
) {
  const router = useRouter();
  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;

  const onBlockRef = useRef(onBlock);
  onBlockRef.current = onBlock;

  const proceed = useCallback((url: string) => {
    router.push(url);
  }, [router]);

  useEffect(() => {
    if (!isDirty) return;

    // Browser close/refresh
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Intercept clicks on <a> elements (Next.js Link renders as <a>)
    const handleClick = (e: MouseEvent) => {
      // Find the closest <a> element from the click target
      const anchor = (e.target as HTMLElement).closest('a');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href) return;

      // Only intercept internal navigation (same origin, not hash-only)
      if (anchor.target === '_blank') return;
      if (href.startsWith('http') && !href.startsWith(window.location.origin)) return;
      if (href.startsWith('#')) return;

      // Extract pathname
      const targetPath = href.startsWith('/') ? href : new URL(href, window.location.origin).pathname;

      // Don't block navigation to the same page
      if (targetPath === window.location.pathname) return;

      if (isDirtyRef.current) {
        e.preventDefault();
        e.stopPropagation();
        onBlockRef.current(targetPath);
      }
    };

    // Use capture phase to intercept before Next.js Link handler
    document.addEventListener('click', handleClick, true);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('click', handleClick, true);
    };
  }, [isDirty]);

  return { proceed };
}
