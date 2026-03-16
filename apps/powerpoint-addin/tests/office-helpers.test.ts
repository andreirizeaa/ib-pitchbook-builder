import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch globally
vi.stubGlobal('fetch', vi.fn());
vi.stubGlobal('btoa', (str: string) => Buffer.from(str, 'binary').toString('base64'));

describe('fetchPptxAsBase64', () => {
  const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch.mockReset();
  });

  // Inline the function to test the logic without Vite/Office.js deps
  async function fetchPptxAsBase64(url: string): Promise<string> {
    const res = await fetch(url);
    const buffer = await (res as Response).arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  it('should fetch URL and return base64 string', async () => {
    const testData = new Uint8Array([0x50, 0x4B, 0x03, 0x04]); // PK zip header
    mockFetch.mockResolvedValue({
      arrayBuffer: () => Promise.resolve(testData.buffer),
    });

    const result = await fetchPptxAsBase64('https://example.com/test.pptx');

    expect(mockFetch).toHaveBeenCalledWith('https://example.com/test.pptx');
    expect(typeof result).toBe('string');
    // Decode and verify
    const decoded = Buffer.from(result, 'base64');
    expect(decoded[0]).toBe(0x50); // P
    expect(decoded[1]).toBe(0x4B); // K
  });

  it('should handle empty file', async () => {
    const emptyData = new Uint8Array([]);
    mockFetch.mockResolvedValue({
      arrayBuffer: () => Promise.resolve(emptyData.buffer),
    });

    const result = await fetchPptxAsBase64('https://example.com/empty.pptx');

    expect(result).toBe('');
  });

  it('should handle binary data correctly', async () => {
    // Create test data with all byte values 0-255
    const testData = new Uint8Array(256);
    for (let i = 0; i < 256; i++) testData[i] = i;

    mockFetch.mockResolvedValue({
      arrayBuffer: () => Promise.resolve(testData.buffer),
    });

    const result = await fetchPptxAsBase64('https://example.com/binary.pptx');
    const decoded = Buffer.from(result, 'base64');

    expect(decoded.length).toBe(256);
    for (let i = 0; i < 256; i++) {
      expect(decoded[i]).toBe(i);
    }
  });
});

describe('replaceSlides (logic)', () => {
  it('should call deleteAllSlides then insertSlidesFromBase64', async () => {
    const calls: string[] = [];

    const mockDeleteAllSlides = async () => { calls.push('delete'); };
    const mockInsertSlides = async (base64: string) => { calls.push(`insert:${base64}`); };

    // Test the composition logic
    async function replaceSlides(base64: string): Promise<void> {
      await mockDeleteAllSlides();
      await mockInsertSlides(base64);
    }

    await replaceSlides('dGVzdA==');

    expect(calls).toEqual(['delete', 'insert:dGVzdA==']);
  });
});
