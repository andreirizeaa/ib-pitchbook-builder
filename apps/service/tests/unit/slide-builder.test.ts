import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SlideBuilderService } from '../../src/services/slide-builder.service';
import type { ContentPlan, TemplateAnalysis } from '@pitchdeck/shared-types';

// Mock image-source to avoid network calls
vi.mock('../../src/services/image-source.service', () => ({
  imageSource: {
    fetchMultiple: vi.fn().mockResolvedValue(new Map()),
    queryForSlide: vi.fn().mockReturnValue('business corporate'),
  },
}));

describe('SlideBuilderService', () => {
  let builder: SlideBuilderService;

  const defaultTemplateAnalysis: TemplateAnalysis = {
    slide_layouts: [
      {
        name: 'Title Slide', index: 0,
        placeholders: [
          { idx: 0, type: 'title', left: 0.5, top: 2.0, width: 9.0, height: 1.5 },
          { idx: 1, type: 'subtitle', left: 0.5, top: 3.8, width: 9.0, height: 1.0 },
        ],
      },
      {
        name: 'Content Slide', index: 1,
        placeholders: [
          { idx: 0, type: 'title', left: 0.5, top: 0.3, width: 9.0, height: 0.8 },
          { idx: 1, type: 'body', left: 0.5, top: 1.3, width: 9.0, height: 5.0 },
        ],
      },
      {
        name: 'Key Metrics', index: 2,
        placeholders: [
          { idx: 0, type: 'title', left: 0.5, top: 0.3, width: 9.0, height: 0.8 },
        ],
      },
    ],
    color_palette: {
      primary: '#003366', secondary: '#0066CC', accent: '#FF6600',
      background: '#FFFFFF', text: '#333333',
      colors: ['#003366', '#0066CC', '#336699', '#669ACC', '#99CCE5', '#FF6600', '#333333', '#666666'],
    },
    fonts: [
      { name: 'Calibri', size: 36, bold: true, color: '#003366' },
      { name: 'Calibri', size: 22, bold: true, color: '#003366' },
      { name: 'Calibri', size: 14, color: '#333333' },
    ],
    master_slides: [], // Default mode (no template)
  };

  const minimalContentPlan: ContentPlan = {
    title: 'Apple Inc. — Company Overview',
    narrative_arc: 'Overview of Apple.',
    slides: [
      {
        index: 0,
        title: 'Apple Inc. — Company Overview',
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
        layout: 'Content Slide',
        talking_points: ['Key highlights'],
        data_requirements: [],
        content_blocks: [
          { type: 'bullet_list', content: ['Revenue of $394B', 'Market cap of $3T', 'Strong growth trajectory'] },
        ],
      },
      {
        index: 2,
        title: 'Key Metrics',
        layout: 'Key Metrics',
        talking_points: ['Financial snapshot'],
        data_requirements: [],
        content_blocks: [
          { type: 'metric', content: { label: 'Market Cap', value: '$3.0T' } },
          { type: 'metric', content: { label: 'Revenue', value: '$394B' } },
        ],
      },
    ],
  };

  beforeEach(() => {
    builder = new SlideBuilderService();
  });

  describe('buildPresentation', () => {
    it('should generate a valid PPTX buffer', async () => {
      const result = await builder.buildPresentation(
        minimalContentPlan,
        defaultTemplateAnalysis,
        { pbType: 'company_overview', company: 'Apple Inc.' },
      );

      expect(result.buffer).toBeDefined();
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.buffer.length).toBeGreaterThan(0);
    });

    it('should return slides data matching the content plan', async () => {
      const result = await builder.buildPresentation(
        minimalContentPlan,
        defaultTemplateAnalysis,
        { pbType: 'company_overview' },
      );

      expect(result.slidesData).toHaveLength(minimalContentPlan.slides.length);
      result.slidesData.forEach((slide, i) => {
        expect(slide.title).toBe(minimalContentPlan.slides[i].title);
        expect(slide.layout).toBe(minimalContentPlan.slides[i].layout);
        expect(slide.index).toBe(i);
      });
    });

    it('should include content in slides data', async () => {
      const result = await builder.buildPresentation(
        minimalContentPlan,
        defaultTemplateAnalysis,
        { pbType: 'company_overview' },
      );

      // Title slide should have text content
      const titleSlide = result.slidesData[0];
      expect(titleSlide.content.length).toBeGreaterThan(0);
      expect(titleSlide.content.some(c => c.type === 'text')).toBe(true);
    });

    it('should use default mode when master_slides is empty', async () => {
      const result = await builder.buildPresentation(
        minimalContentPlan,
        { ...defaultTemplateAnalysis, master_slides: [] },
        { pbType: 'company_overview' },
      );

      expect(result.buffer.length).toBeGreaterThan(0);
      expect(result.slidesData.length).toBe(3);
    });

    it('should handle single-slide content plan', async () => {
      const singleSlide: ContentPlan = {
        title: 'One Slide',
        narrative_arc: '',
        slides: [{
          index: 0,
          title: 'Only Slide',
          layout: 'Content Slide',
          talking_points: [],
          data_requirements: [],
          content_blocks: [{ type: 'paragraph', content: 'Simple content' }],
        }],
      };

      const result = await builder.buildPresentation(singleSlide, defaultTemplateAnalysis);

      expect(result.slidesData).toHaveLength(1);
      expect(result.buffer.length).toBeGreaterThan(0);
    });

    it('should handle content plan with empty content blocks', async () => {
      const emptyBlocks: ContentPlan = {
        title: 'Empty',
        narrative_arc: '',
        slides: [{
          index: 0,
          title: 'Empty Slide',
          layout: 'Content Slide',
          talking_points: [],
          data_requirements: [],
          content_blocks: [],
        }],
      };

      const result = await builder.buildPresentation(emptyBlocks, defaultTemplateAnalysis);

      expect(result.slidesData).toHaveLength(1);
      expect(result.buffer.length).toBeGreaterThan(0);
    });

    it('should include notes from talking points', async () => {
      const result = await builder.buildPresentation(
        minimalContentPlan,
        defaultTemplateAnalysis,
      );

      expect(result.slidesData[0].notes).toBe('Confidential');
    });

    it('should handle chart slides', async () => {
      const chartPlan: ContentPlan = {
        title: 'Chart Test',
        narrative_arc: '',
        slides: [{
          index: 0,
          title: 'Revenue Chart',
          layout: 'Chart Slide',
          talking_points: [],
          data_requirements: [],
          content_blocks: [{
            type: 'chart',
            content: {
              chartType: 'bar',
              title: 'Revenue',
              data: [
                { name: 'Revenue ($B)', labels: ['2022', '2023', '2024'], values: [365, 394, 420] },
              ],
            },
          }],
        }],
      };

      const result = await builder.buildPresentation(chartPlan, defaultTemplateAnalysis, { pbType: 'company_overview' });

      expect(result.slidesData).toHaveLength(1);
      expect(result.buffer.length).toBeGreaterThan(0);
    });

    it('should handle table slides', async () => {
      const tablePlan: ContentPlan = {
        title: 'Table Test',
        narrative_arc: '',
        slides: [{
          index: 0,
          title: 'Financial Summary',
          layout: 'Financial Table',
          talking_points: [],
          data_requirements: [],
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

      const result = await builder.buildPresentation(tablePlan, defaultTemplateAnalysis, { pbType: 'company_overview' });

      expect(result.slidesData).toHaveLength(1);
      expect(result.slidesData[0].content.some(c => c.type === 'table')).toBe(true);
    });

    it('should generate valid PPTX for all layout types', async () => {
      const allLayouts: ContentPlan = {
        title: 'All Layouts',
        narrative_arc: '',
        slides: [
          { index: 0, title: 'Title', layout: 'Title Slide', talking_points: [], data_requirements: [], content_blocks: [{ type: 'heading', content: 'Title' }] },
          { index: 1, title: 'Section', layout: 'Section Header', talking_points: [], data_requirements: [], content_blocks: [] },
          { index: 2, title: 'Content', layout: 'Content Slide', talking_points: [], data_requirements: [], content_blocks: [{ type: 'paragraph', content: 'Text' }] },
          { index: 3, title: 'Two Col', layout: 'Two Column', talking_points: [], data_requirements: [], content_blocks: [{ type: 'bullet_list', content: ['A', 'B', 'C', 'D'] }] },
          { index: 4, title: 'Exec', layout: 'Executive Summary', talking_points: [], data_requirements: [], content_blocks: [{ type: 'bullet_list', content: ['Key 1', 'Key 2', 'Key 3', 'Key 4'] }] },
        ],
      };

      const result = await builder.buildPresentation(allLayouts, defaultTemplateAnalysis, { pbType: 'company_overview' });

      expect(result.slidesData).toHaveLength(5);
      expect(result.buffer.length).toBeGreaterThan(0);
    });
  });
});
