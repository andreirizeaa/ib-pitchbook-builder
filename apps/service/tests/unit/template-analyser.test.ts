import { describe, it, expect, beforeEach } from 'vitest';
import JSZip from 'jszip';
import { TemplateAnalyserService } from '../../src/services/template-analyser.service';

describe('TemplateAnalyserService', () => {
  let analyser: TemplateAnalyserService;

  beforeEach(() => {
    analyser = new TemplateAnalyserService();
  });

  describe('analyseTemplate', () => {
    it('should return default analysis for empty buffer', async () => {
      const result = await analyser.analyseTemplate(Buffer.alloc(0), 'empty.pptx');

      expect(result).toBeDefined();
      expect(result.slide_layouts).toBeDefined();
      expect(result.slide_layouts.length).toBeGreaterThan(0);
      expect(result.color_palette).toBeDefined();
      expect(result.fonts).toBeDefined();
      expect(result.master_slides).toEqual([]);
    });

    it('should return default analysis for null buffer', async () => {
      const result = await analyser.analyseTemplate(null as any, 'null.pptx');

      expect(result.slide_layouts.length).toBeGreaterThan(0);
      expect(result.master_slides).toEqual([]);
    });

    it('should return default IB colour palette for empty buffer', async () => {
      const result = await analyser.analyseTemplate(Buffer.alloc(0), 'empty.pptx');
      const palette = result.color_palette;

      expect(palette.primary).toBe('#003366');
      expect(palette.secondary).toBe('#0066CC');
      expect(palette.accent).toBe('#FF6600');
      expect(palette.background).toBe('#FFFFFF');
      expect(palette.text).toBe('#333333');
      expect(palette.colors).toHaveLength(8);
    });

    it('should return Calibri as default font', async () => {
      const result = await analyser.analyseTemplate(Buffer.alloc(0), 'empty.pptx');

      expect(result.fonts.length).toBeGreaterThan(0);
      result.fonts.forEach(font => {
        expect(font.name).toBe('Calibri');
      });
    });

    it('should return 9 default layouts with correct names', async () => {
      const result = await analyser.analyseTemplate(Buffer.alloc(0), 'empty.pptx');
      const layoutNames = result.slide_layouts.map(l => l.name);

      expect(layoutNames).toContain('Title Slide');
      expect(layoutNames).toContain('Section Header');
      expect(layoutNames).toContain('Content Slide');
      expect(layoutNames).toContain('Two Column');
      expect(layoutNames).toContain('Financial Table');
      expect(layoutNames).toContain('Chart Slide');
      expect(layoutNames).toContain('Key Metrics');
      expect(layoutNames).toContain('Executive Summary');
      expect(layoutNames).toContain('Comparison Table');
    });

    it('should have correct placeholder types in Title Slide layout', async () => {
      const result = await analyser.analyseTemplate(Buffer.alloc(0), 'empty.pptx');
      const titleLayout = result.slide_layouts.find(l => l.name === 'Title Slide');

      expect(titleLayout).toBeDefined();
      const phTypes = titleLayout!.placeholders.map(p => p.type);
      expect(phTypes).toContain('title');
      expect(phTypes).toContain('subtitle');
      expect(phTypes).toContain('date');
    });

    it('should parse a valid .pptx file (minimal OOXML)', async () => {
      // Create a minimal .pptx (ZIP) with a theme file
      const zip = new JSZip();

      // Add a minimal theme XML
      zip.file('ppt/theme/theme1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="TestTheme">
          <a:themeElements>
            <a:clrScheme name="Custom">
              <a:dk1><a:srgbClr val="1A1A2E"/></a:dk1>
              <a:dk2><a:srgbClr val="16213E"/></a:dk2>
              <a:lt1><a:srgbClr val="FAFAFA"/></a:lt1>
              <a:lt2><a:srgbClr val="E8E8E8"/></a:lt2>
              <a:accent1><a:srgbClr val="0F3460"/></a:accent1>
              <a:accent2><a:srgbClr val="E94560"/></a:accent2>
              <a:accent3><a:srgbClr val="533483"/></a:accent3>
              <a:accent4><a:srgbClr val="53354A"/></a:accent4>
              <a:accent5><a:srgbClr val="903749"/></a:accent5>
              <a:accent6><a:srgbClr val="2B2E4A"/></a:accent6>
            </a:clrScheme>
            <a:fontScheme name="Custom">
              <a:majorFont><a:latin typeface="Arial"/></a:majorFont>
              <a:minorFont><a:latin typeface="Helvetica"/></a:minorFont>
            </a:fontScheme>
          </a:themeElements>
        </a:theme>`);

      // Add a slide layout
      zip.file('ppt/slideLayouts/slideLayout1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <p:sldLayout xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
                     xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <p:cSld name="Test Layout">
            <p:spTree>
              <p:sp>
                <p:nvSpPr>
                  <p:nvPr><p:ph type="title" idx="0"/></p:nvPr>
                </p:nvSpPr>
                <p:spPr>
                  <a:xfrm>
                    <a:off x="457200" y="274638"/>
                    <a:ext cx="8229600" cy="1143000"/>
                  </a:xfrm>
                </p:spPr>
              </p:sp>
              <p:sp>
                <p:nvSpPr>
                  <p:nvPr><p:ph type="body" idx="1"/></p:nvPr>
                </p:nvSpPr>
                <p:spPr>
                  <a:xfrm>
                    <a:off x="457200" y="1600200"/>
                    <a:ext cx="8229600" cy="4525963"/>
                  </a:xfrm>
                </p:spPr>
              </p:sp>
            </p:spTree>
          </p:cSld>
        </p:sldLayout>`);

      // Add a slide master
      zip.file('ppt/slideMasters/slideMaster1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <p:sldMaster xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
                     xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <p:cSld name="Custom Master">
            <p:spTree/>
          </p:cSld>
        </p:sldMaster>`);

      const buffer = await zip.generateAsync({ type: 'nodebuffer' });
      const result = await analyser.analyseTemplate(buffer, 'test.pptx');

      // Should parse the theme colours
      expect(result.color_palette.primary).toBe('#0F3460');
      expect(result.color_palette.secondary).toBe('#E94560');
      expect(result.color_palette.text).toBe('#1A1A2E');
      expect(result.color_palette.background).toBe('#FAFAFA');

      // Should extract fonts from theme
      expect(result.fonts.some(f => f.name === 'Arial')).toBe(true);
      expect(result.fonts.some(f => f.name === 'Helvetica')).toBe(true);

      // Should parse slide layout
      expect(result.slide_layouts.length).toBe(1);
      expect(result.slide_layouts[0].name).toBe('Test Layout');
      expect(result.slide_layouts[0].placeholders.length).toBe(2);

      // Check placeholder EMU to inches conversion
      const titlePh = result.slide_layouts[0].placeholders.find(p => p.type === 'title');
      expect(titlePh).toBeDefined();
      expect(titlePh!.left).toBeCloseTo(0.5, 1);
      expect(titlePh!.top).toBeCloseTo(0.3, 1);

      // Should extract master slides
      expect(result.master_slides.length).toBe(1);
      expect(result.master_slides[0].name).toBe('Custom Master');
    });

    it('should handle invalid ZIP gracefully', async () => {
      const result = await analyser.analyseTemplate(Buffer.from('not a zip'), 'invalid.pptx');

      // Should fall back to defaults
      expect(result.slide_layouts.length).toBeGreaterThan(0);
      expect(result.color_palette.primary).toBe('#003366');
    });

    it('should handle ZIP without theme file', async () => {
      const zip = new JSZip();
      zip.file('dummy.txt', 'hello');
      const buffer = await zip.generateAsync({ type: 'nodebuffer' });

      const result = await analyser.analyseTemplate(buffer, 'no-theme.pptx');

      expect(result.color_palette.primary).toBe('#003366');
      expect(result.fonts.every(f => f.name === 'Calibri')).toBe(true);
    });
  });

  describe('placeholder positions', () => {
    it('should have valid positions (non-negative) in all default layouts', async () => {
      const result = await analyser.analyseTemplate(Buffer.alloc(0), 'empty.pptx');

      for (const layout of result.slide_layouts) {
        for (const ph of layout.placeholders) {
          expect(ph.left).toBeGreaterThanOrEqual(0);
          expect(ph.top).toBeGreaterThanOrEqual(0);
          expect(ph.width).toBeGreaterThan(0);
          expect(ph.height).toBeGreaterThan(0);
        }
      }
    });

    it('should have sequential indices in default layouts', async () => {
      const result = await analyser.analyseTemplate(Buffer.alloc(0), 'empty.pptx');

      for (const layout of result.slide_layouts) {
        expect(layout.index).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
