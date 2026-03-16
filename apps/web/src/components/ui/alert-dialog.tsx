'use client';

import { useEffect, useRef } from 'react';
import { Button } from './button';

interface AlertDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'destructive' | 'default';
  isLoading?: boolean;
}

export function AlertDialog({ open, onClose, onConfirm, title, description, confirmLabel = 'Delete', cancelLabel = 'Cancel', variant = 'destructive', isLoading }: AlertDialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="bg-white dark:bg-[var(--card)] rounded-lg shadow-lg p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--foreground)' }}>{title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{description}</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>{cancelLabel}</Button>
          <Button variant={variant} onClick={onConfirm} disabled={isLoading}>
            {isLoading ? 'Loading...' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
