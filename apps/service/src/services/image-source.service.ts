import env from '../config/env';

/**
 * Image Source Service
 *
 * Fetches stock photographs from Unsplash for embedding in slides.
 * Returns base64 data URIs ready for PptxGenJS addImage().
 */
export class ImageSourceService {
  private cache = new Map<string, string>();

  /**
   * Search for an image matching the query.
   * Returns a data URI string (data:image/jpeg;base64,...) or null.
   */
  async fetchImage(query: string, orientation: 'landscape' | 'portrait' = 'landscape'): Promise<string | null> {
    const apiKey = env.UNSPLASH_ACCESS_KEY;
    if (!apiKey) {
      console.warn('[ImageSource] No UNSPLASH_ACCESS_KEY configured');
      return null;
    }

    const cacheKey = `${query}:${orientation}`;
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey)!;

    try {
      const searchUrl = new URL('https://api.unsplash.com/search/photos');
      searchUrl.searchParams.set('query', query);
      searchUrl.searchParams.set('orientation', orientation);
      searchUrl.searchParams.set('per_page', '3');
      searchUrl.searchParams.set('content_filter', 'high');

      console.log(`[ImageSource] Searching Unsplash for: "${query}"`);

      const searchRes = await fetch(searchUrl.toString(), {
        headers: { Authorization: `Client-ID ${apiKey}` },
        signal: AbortSignal.timeout(10000),
      });

      if (!searchRes.ok) {
        console.warn(`[ImageSource] Unsplash search failed: ${searchRes.status} ${searchRes.statusText}`);
        return null;
      }

      const searchData = await searchRes.json();
      const photo = searchData?.results?.[0];
      if (!photo) {
        console.warn(`[ImageSource] No results for "${query}"`);
        return null;
      }

      // Download at "regular" size (~1080px wide) for good quality in slides
      const imageUrl = photo.urls?.regular || photo.urls?.small || photo.urls?.thumb;
      if (!imageUrl) return null;

      console.log(`[ImageSource] Downloading image: ${imageUrl.substring(0, 80)}...`);

      const imgRes = await fetch(imageUrl, {
        signal: AbortSignal.timeout(15000),
      });

      if (!imgRes.ok) return null;

      const buffer = Buffer.from(await imgRes.arrayBuffer());
      // PptxGenJS expects data URI format: data:image/jpeg;base64,<data>
      const dataUri = `data:image/jpeg;base64,${buffer.toString('base64')}`;

      console.log(`[ImageSource] Successfully fetched image (${(buffer.length / 1024).toFixed(0)}KB)`);

      this.cache.set(cacheKey, dataUri);
      return dataUri;
    } catch (err) {
      console.warn(`[ImageSource] Failed to fetch image for "${query}":`, (err as Error).message);
      return null;
    }
  }

  /**
   * Fetch multiple images in parallel for different slides.
   */
  async fetchMultiple(queries: { key: string; query: string; orientation?: 'landscape' | 'portrait' }[]): Promise<Map<string, string>> {
    const results = new Map<string, string>();
    const fetches = queries.map(async ({ key, query, orientation }) => {
      const img = await this.fetchImage(query, orientation || 'landscape');
      if (img) results.set(key, img);
    });
    await Promise.allSettled(fetches);
    return results;
  }

  /**
   * Build a search query from slide context.
   */
  queryForSlide(slideTitle: string, company?: string): string {
    const topicMap: Record<string, string> = {
      'title': 'modern city skyline aerial',
      'executive': 'business strategy boardroom',
      'overview': 'corporate headquarters modern building',
      'market': 'stock exchange trading floor',
      'financial': 'financial data analytics dashboard',
      'transaction': 'business handshake corporate deal',
      'valuation': 'growth chart upward trend',
      'risk': 'chess strategy planning',
      'outlook': 'sunrise cityscape horizon',
      'capital': 'skyscraper financial district',
      'sector': 'technology innovation industry',
      'strength': 'mountain peak achievement',
      'performance': 'race track speed performance',
      'comparison': 'balance scale comparison',
    };

    const lower = slideTitle.toLowerCase();
    for (const [keyword, query] of Object.entries(topicMap)) {
      if (lower.includes(keyword)) return query;
    }

    return 'modern corporate office architecture';
  }
}

export const imageSource = new ImageSourceService();
