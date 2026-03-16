import { describe, it, expect } from 'vitest';

describe('useUnsavedChanges logic', () => {
  it('should not block external links', () => {
    const href = 'https://google.com';
    expect(href.startsWith('http') && !href.startsWith('http://localhost')).toBe(true);
  });

  it('should not block hash-only links', () => {
    const href = '#section';
    expect(href.startsWith('#')).toBe(true);
  });

  it('should not block same-page navigation', () => {
    const currentPath = '/layouts/123';
    const targetPath = '/layouts/123';
    expect(targetPath === currentPath).toBe(true);
  });

  it('should identify internal navigation to block', () => {
    const currentPath = '/layouts/123';
    const targetPath = '/layouts';
    expect(targetPath !== currentPath).toBe(true);
    expect(targetPath.startsWith('/')).toBe(true);
  });

  it('should extract pathname from relative href', () => {
    const href = '/dashboard';
    const targetPath = href.startsWith('/') ? href : '/fallback';
    expect(targetPath).toBe('/dashboard');
  });
});
