import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/config/env', () => ({ default: { UNSPLASH_ACCESS_KEY: '' } }));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { ImageSourceService } from '../../src/services/image-source.service';
import env from '../../src/config/env';

describe('ImageSourceService', () => {
  let service: ImageSourceService;

  beforeEach(() => {
    service = new ImageSourceService();
    vi.mocked(env).UNSPLASH_ACCESS_KEY = '';
    mockFetch.mockReset();
  });

  describe('queryForSlide', () => {
    it('should return "business strategy boardroom" for Executive Summary', () => {
      expect(service.queryForSlide('Executive Summary')).toBe('business strategy boardroom');
    });

    it('should return "stock exchange trading floor" for Market Position', () => {
      expect(service.queryForSlide('Market Position')).toBe('stock exchange trading floor');
    });

    it('should return default query for unrecognized slide name', () => {
      expect(service.queryForSlide('Appendix Notes')).toBe('modern corporate office architecture');
    });
  });

  describe('fetchImage', () => {
    it('should return null when no API key is configured', async () => {
      const result = await service.fetchImage('test query');
      expect(result).toBeNull();
    });

    it('should return cached result on second call', async () => {
      vi.mocked(env).UNSPLASH_ACCESS_KEY = 'test-key';

      const imageBuffer = Buffer.from('fake-image-data');
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            results: [{ urls: { regular: 'https://images.unsplash.com/photo-1' } }],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: async () => imageBuffer.buffer,
        });

      const first = await service.fetchImage('test query');
      const second = await service.fetchImage('test query');

      expect(first).not.toBeNull();
      expect(first).toBe(second);
      // fetch should only have been called for the first request (2 calls: search + download)
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should return null on fetch error', async () => {
      vi.mocked(env).UNSPLASH_ACCESS_KEY = 'test-key';
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await service.fetchImage('test query');
      expect(result).toBeNull();
    });

    it('should return null when search has no results', async () => {
      vi.mocked(env).UNSPLASH_ACCESS_KEY = 'test-key';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] }),
      });

      const result = await service.fetchImage('nonexistent query');
      expect(result).toBeNull();
    });
  });

  describe('fetchMultiple', () => {
    it('should return a Map of results', async () => {
      vi.mocked(env).UNSPLASH_ACCESS_KEY = 'test-key';

      const imageBuffer = Buffer.from('fake-image-data');
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [{ urls: { regular: 'https://images.unsplash.com/photo-1' } }],
        }),
        arrayBuffer: async () => imageBuffer.buffer,
      });

      const queries = [
        { key: 'slide1', query: 'business' },
        { key: 'slide2', query: 'finance' },
      ];

      const results = await service.fetchMultiple(queries);

      expect(results).toBeInstanceOf(Map);
      expect(results.size).toBe(2);
      expect(results.has('slide1')).toBe(true);
      expect(results.has('slide2')).toBe(true);
    });
  });
});
