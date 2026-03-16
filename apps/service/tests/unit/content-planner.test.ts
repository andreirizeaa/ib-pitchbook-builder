import { describe, it, expect } from 'vitest';
import { parseContentPlan, contentPlanSchema } from '../../src/prompts/pitchbook-content.schema';

describe('ContentPlan Schema Validation', () => {
  describe('parseContentPlan', () => {
    it('should parse a valid content plan', () => {
      const raw = {
        title: 'Apple Inc. — Company Overview',
        narrative_arc: 'Overview of Apple covering financial performance and market position.',
        slides: [
          {
            index: 0,
            title: 'Cover Page',
            layout: 'Title Slide',
            talking_points: ['Confidential'],
            data_requirements: [],
            content_blocks: [
              { type: 'heading', content: 'Apple Inc. (AAPL)' },
              { type: 'paragraph', content: 'Company Overview | M&A' },
            ],
          },
          {
            index: 1,
            title: 'Executive Summary',
            layout: 'Executive Summary',
            talking_points: ['Key highlights'],
            data_requirements: ['market_cap', 'revenue'],
            content_blocks: [
              { type: 'bullet_list', content: ['Revenue of $394B', 'Market cap of $3T'] },
            ],
          },
        ],
      };

      const result = parseContentPlan(raw);

      expect(result.title).toBe('Apple Inc. — Company Overview');
      expect(result.narrative_arc).toBe('Overview of Apple covering financial performance and market position.');
      expect(result.slides).toHaveLength(2);
      expect(result.slides[0].title).toBe('Cover Page');
      expect(result.slides[0].layout).toBe('Title Slide');
      expect(result.slides[1].content_blocks[0].type).toBe('bullet_list');
    });

    it('should apply defaults for missing optional fields', () => {
      const raw = {
        title: 'Test Deck',
        slides: [
          { title: 'Slide 1' },
        ],
      };

      const result = parseContentPlan(raw);

      expect(result.narrative_arc).toBe('');
      expect(result.slides[0].layout).toBe('Content Slide');
      expect(result.slides[0].talking_points).toEqual([]);
      expect(result.slides[0].data_requirements).toEqual([]);
      expect(result.slides[0].content_blocks).toEqual([]);
    });

    it('should reject missing title', () => {
      const raw = { slides: [{ title: 'Slide' }] };

      expect(() => parseContentPlan(raw)).toThrow();
    });

    it('should reject missing slides array', () => {
      const raw = { title: 'Test' };

      expect(() => parseContentPlan(raw)).toThrow();
    });

    it('should reject invalid content block type', () => {
      const raw = {
        title: 'Test',
        slides: [{
          title: 'Slide 1',
          content_blocks: [{ type: 'invalid_type', content: 'test' }],
        }],
      };

      expect(() => parseContentPlan(raw)).toThrow();
    });

    it('should accept all valid content block types', () => {
      const blockTypes = ['heading', 'paragraph', 'bullet_list', 'table', 'chart', 'metric'];

      for (const type of blockTypes) {
        const raw = {
          title: 'Test',
          slides: [{
            title: 'Slide',
            content_blocks: [{ type, content: 'test content' }],
          }],
        };

        const result = parseContentPlan(raw);
        expect(result.slides[0].content_blocks[0].type).toBe(type);
      }
    });

    it('should handle table content block with headers and rows', () => {
      const raw = {
        title: 'Financial Summary',
        slides: [{
          title: 'Summary Table',
          content_blocks: [{
            type: 'table',
            content: {
              headers: ['Metric', 'FY2023', 'FY2024'],
              rows: [
                ['Revenue', '$394B', '$420B'],
                ['EBITDA', '$120B', '$135B'],
              ],
            },
          }],
        }],
      };

      const result = parseContentPlan(raw);
      expect(result.slides[0].content_blocks[0].content.headers).toHaveLength(3);
      expect(result.slides[0].content_blocks[0].content.rows).toHaveLength(2);
    });

    it('should handle chart content block with data series', () => {
      const raw = {
        title: 'Revenue Trend',
        slides: [{
          title: 'Revenue Chart',
          content_blocks: [{
            type: 'chart',
            content: {
              chartType: 'bar',
              title: 'Revenue Over Time',
              data: [
                { name: 'Revenue ($B)', labels: ['FY2022', 'FY2023', 'FY2024'], values: [365, 394, 420] },
              ],
            },
          }],
        }],
      };

      const result = parseContentPlan(raw);
      expect(result.slides[0].content_blocks[0].content.data[0].values).toHaveLength(3);
    });

    it('should handle metric content blocks', () => {
      const raw = {
        title: 'Key Metrics',
        slides: [{
          title: 'Metrics',
          content_blocks: [
            { type: 'metric', content: { label: 'Market Cap', value: '$3.0T' } },
            { type: 'metric', content: { label: 'Revenue', value: '$394B' } },
            { type: 'metric', content: { label: 'P/E Ratio', value: '28.5x' } },
          ],
        }],
      };

      const result = parseContentPlan(raw);
      expect(result.slides[0].content_blocks).toHaveLength(3);
      expect(result.slides[0].content_blocks[0].content.label).toBe('Market Cap');
    });

    it('should parse multi-slide plans with all layout types', () => {
      const layouts = [
        'Title Slide', 'Section Header', 'Content Slide', 'Two Column',
        'Financial Table', 'Chart Slide', 'Key Metrics', 'Executive Summary',
      ];

      const raw = {
        title: 'Full Deck',
        narrative_arc: 'Complete pitch book',
        slides: layouts.map((layout, i) => ({
          index: i,
          title: `Slide ${i + 1}`,
          layout,
          talking_points: [`Point for slide ${i + 1}`],
          content_blocks: [{ type: 'paragraph', content: `Content for ${layout}` }],
        })),
      };

      const result = parseContentPlan(raw);
      expect(result.slides).toHaveLength(layouts.length);
      result.slides.forEach((slide, i) => {
        expect(slide.layout).toBe(layouts[i]);
      });
    });
  });
});
