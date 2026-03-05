import JSZip from 'jszip';
import { parseStringPromise } from 'xml2js';
import type { TemplateAnalysis, SlideLayout, ColorPalette, FontSpec, Placeholder, MasterSlide } from '@pitchdeck/shared-types';

/**
 * Template Analyser Service
 *
 * Extracts layout structures, colour palettes, font specifications,
 * and placeholder positions from reference .pptx files by parsing
 * the underlying Office Open XML (OOXML) structure.
 *
 * A .pptx file is a ZIP archive containing XML files:
 * - ppt/presentation.xml — master references
 * - ppt/slideMasters/*.xml — master slide definitions
 * - ppt/slideLayouts/*.xml — layout definitions with placeholders
 * - ppt/theme/theme1.xml — colour scheme and fonts
 * - ppt/slides/*.xml — actual slide content
 */
export class TemplateAnalyserService {

  /**
   * Analyse a .pptx file buffer and extract its structural patterns.
   */
  async analyseTemplate(fileBuffer: Buffer, fileName: string): Promise<TemplateAnalysis> {
    // If empty buffer, return professional IB defaults
    if (!fileBuffer || fileBuffer.length === 0) {
      return this.getDefaultAnalysis();
    }

    try {
      const zip = await JSZip.loadAsync(fileBuffer);

      const [slideLayouts, colorPalette, fonts, masterSlides] = await Promise.all([
        this.extractSlideLayouts(zip),
        this.extractColorPalette(zip),
        this.extractFonts(zip),
        this.extractMasterSlides(zip),
      ]);

      return {
        slide_layouts: slideLayouts.length > 0 ? slideLayouts : this.getDefaultLayouts(),
        color_palette: colorPalette,
        fonts: fonts.length > 0 ? fonts : this.getDefaultFonts(),
        master_slides: masterSlides,
      };
    } catch (error: any) {
      console.error(`[TemplateAnalyser] Failed to parse .pptx: ${error.message}`);
      return this.getDefaultAnalysis();
    }
  }

  /**
   * Extract slide layouts from ppt/slideLayouts/*.xml
   * Each layout defines placeholder positions, types, and sizes.
   */
  private async extractSlideLayouts(zip: JSZip): Promise<SlideLayout[]> {
    const layouts: SlideLayout[] = [];
    const layoutFiles = Object.keys(zip.files).filter(f => f.startsWith('ppt/slideLayouts/') && f.endsWith('.xml'));

    for (let i = 0; i < layoutFiles.length; i++) {
      try {
        const xml = await zip.file(layoutFiles[i])?.async('text');
        if (!xml) continue;

        const parsed = await parseStringPromise(xml, { explicitArray: false, ignoreAttrs: false });
        const cSld = parsed?.['p:sldLayout']?.['p:cSld'];
        if (!cSld) continue;

        const layoutName = cSld?.$?.name || `Layout ${i + 1}`;
        const placeholders = this.extractPlaceholders(cSld);

        layouts.push({
          name: layoutName,
          index: i,
          placeholders,
          background: this.extractBackground(cSld),
        });
      } catch {
        // Skip malformed layout files
      }
    }

    return layouts;
  }

  /**
   * Extract placeholders from a slide/layout common slide data (cSld).
   * Parses sp (shape) elements within spTree (shape tree).
   */
  private extractPlaceholders(cSld: any): Placeholder[] {
    const placeholders: Placeholder[] = [];
    const spTree = cSld?.['p:spTree'];
    if (!spTree) return placeholders;

    // Shapes can be a single object or array
    let shapes = spTree?.['p:sp'];
    if (!shapes) return placeholders;
    if (!Array.isArray(shapes)) shapes = [shapes];

    for (const sp of shapes) {
      try {
        const nvSpPr = sp?.['p:nvSpPr'];
        const spPr = sp?.['p:spPr'];
        const nvPr = nvSpPr?.['p:nvPr'];
        const ph = nvPr?.['p:ph'];

        if (!ph) continue; // Not a placeholder

        const phType = ph?.$?.type || 'body';
        const phIdx = parseInt(ph?.$?.idx || '0', 10);

        // Extract position from spPr > a:xfrm
        const xfrm = spPr?.['a:xfrm'];
        const off = xfrm?.['a:off'];
        const ext = xfrm?.['a:ext'];

        // EMU to inches conversion (1 inch = 914400 EMU)
        const emuToInch = (emu: string | number) => Math.round((Number(emu) / 914400) * 100) / 100;

        const left = off?.$?.x ? emuToInch(off.$.x) : 0;
        const top = off?.$?.y ? emuToInch(off.$.y) : 0;
        const width = ext?.$?.cx ? emuToInch(ext.$.cx) : 0;
        const height = ext?.$?.cy ? emuToInch(ext.$.cy) : 0;

        // Extract font from txBody
        const font = this.extractFontFromShape(sp);

        const placeholder: Placeholder = {
          idx: phIdx,
          type: this.mapPlaceholderType(phType),
          left,
          top,
          width,
          height,
          ...(font ? { font } : {}),
        };

        placeholders.push(placeholder);
      } catch {
        // Skip malformed shapes
      }
    }

    return placeholders;
  }

  /**
   * Map OOXML placeholder type strings to our enum.
   */
  private mapPlaceholderType(type: string): Placeholder['type'] {
    const mapping: Record<string, Placeholder['type']> = {
      'title': 'title',
      'ctrTitle': 'title',
      'subTitle': 'subtitle',
      'body': 'body',
      'obj': 'body',
      'pic': 'picture',
      'tbl': 'table',
      'chart': 'chart',
      'ftr': 'footer',
      'dt': 'date',
      'sldNum': 'slide_number',
    };
    return mapping[type] || 'body';
  }

  /**
   * Extract font properties from a shape's text body.
   */
  private extractFontFromShape(sp: any): FontSpec | null {
    try {
      const txBody = sp?.['p:txBody'];
      if (!txBody) return null;

      let paragraphs = txBody?.['a:p'];
      if (!paragraphs) return null;
      if (!Array.isArray(paragraphs)) paragraphs = [paragraphs];

      for (const para of paragraphs) {
        const runs = para?.['a:r'];
        if (!runs) continue;
        const run = Array.isArray(runs) ? runs[0] : runs;
        const rPr = run?.['a:rPr'];
        if (!rPr) continue;

        const defRPr = para?.['a:pPr']?.['a:defRPr'];
        const props = rPr?.$ || defRPr?.$ || {};

        return {
          name: this.extractFontName(rPr) || 'Calibri',
          size: props.sz ? Math.round(parseInt(props.sz, 10) / 100) : 14,
          bold: props.b === '1' || props.b === 'true',
          italic: props.i === '1' || props.i === 'true',
          color: this.extractColor(rPr?.['a:solidFill']),
        };
      }
    } catch {}
    return null;
  }

  /**
   * Extract font name from run properties.
   */
  private extractFontName(rPr: any): string | null {
    const latin = rPr?.['a:latin'];
    if (latin?.$?.typeface) return latin.$.typeface;
    const cs = rPr?.['a:cs'];
    if (cs?.$?.typeface) return cs.$.typeface;
    return null;
  }

  /**
   * Extract colour palette from ppt/theme/theme1.xml
   * The theme defines the document's colour scheme.
   */
  private async extractColorPalette(zip: JSZip): Promise<ColorPalette> {
    try {
      const themeFiles = Object.keys(zip.files).filter(f => f.startsWith('ppt/theme/') && f.endsWith('.xml'));
      if (themeFiles.length === 0) return this.getDefaultPalette();

      const xml = await zip.file(themeFiles[0])?.async('text');
      if (!xml) return this.getDefaultPalette();

      const parsed = await parseStringPromise(xml, { explicitArray: false, ignoreAttrs: false });
      const themeElements = parsed?.['a:theme']?.['a:themeElements'];
      const clrScheme = themeElements?.['a:clrScheme'];

      if (!clrScheme) return this.getDefaultPalette();

      // Extract standard theme colours
      const getColor = (element: any): string => {
        if (!element) return '';
        const srgb = element?.['a:srgbClr'];
        if (srgb?.$?.val) return `#${srgb.$.val}`;
        const sysClr = element?.['a:sysClr'];
        if (sysClr?.$?.lastClr) return `#${sysClr.$.lastClr}`;
        return '';
      };

      const dk1 = getColor(clrScheme?.['a:dk1']) || '#000000';
      const dk2 = getColor(clrScheme?.['a:dk2']) || '#333333';
      const lt1 = getColor(clrScheme?.['a:lt1']) || '#FFFFFF';
      const lt2 = getColor(clrScheme?.['a:lt2']) || '#F5F5F5';
      const accent1 = getColor(clrScheme?.['a:accent1']) || '#003366';
      const accent2 = getColor(clrScheme?.['a:accent2']) || '#0066CC';
      const accent3 = getColor(clrScheme?.['a:accent3']) || '#336699';
      const accent4 = getColor(clrScheme?.['a:accent4']) || '#669ACC';
      const accent5 = getColor(clrScheme?.['a:accent5']) || '#99CCE5';
      const accent6 = getColor(clrScheme?.['a:accent6']) || '#FF6600';

      return {
        primary: accent1,
        secondary: accent2,
        accent: accent6,
        background: lt1,
        text: dk1,
        colors: [accent1, accent2, accent3, accent4, accent5, accent6, dk1, dk2],
      };
    } catch (error) {
      console.error('[TemplateAnalyser] Failed to extract colors:', error);
      return this.getDefaultPalette();
    }
  }

  /**
   * Extract font definitions from theme.
   */
  private async extractFonts(zip: JSZip): Promise<FontSpec[]> {
    try {
      const themeFiles = Object.keys(zip.files).filter(f => f.startsWith('ppt/theme/') && f.endsWith('.xml'));
      if (themeFiles.length === 0) return this.getDefaultFonts();

      const xml = await zip.file(themeFiles[0])?.async('text');
      if (!xml) return this.getDefaultFonts();

      const parsed = await parseStringPromise(xml, { explicitArray: false, ignoreAttrs: false });
      const fontScheme = parsed?.['a:theme']?.['a:themeElements']?.['a:fontScheme'];

      const majorFont = fontScheme?.['a:majorFont']?.['a:latin']?.$?.typeface || 'Calibri';
      const minorFont = fontScheme?.['a:minorFont']?.['a:latin']?.$?.typeface || 'Calibri';

      return [
        { name: majorFont, size: 36, bold: true, color: '#003366' },   // Title
        { name: majorFont, size: 22, bold: true, color: '#003366' },   // Slide heading
        { name: minorFont, size: 14, color: '#333333' },               // Body
        { name: minorFont, size: 12, color: '#666666' },               // Caption
        { name: minorFont, size: 10, color: '#999999' },               // Footer
      ];
    } catch {
      return this.getDefaultFonts();
    }
  }

  /**
   * Extract master slide information.
   */
  private async extractMasterSlides(zip: JSZip): Promise<MasterSlide[]> {
    const masters: MasterSlide[] = [];
    const masterFiles = Object.keys(zip.files).filter(f => f.startsWith('ppt/slideMasters/') && f.endsWith('.xml'));

    for (let i = 0; i < masterFiles.length; i++) {
      try {
        const xml = await zip.file(masterFiles[i])?.async('text');
        if (!xml) continue;

        const parsed = await parseStringPromise(xml, { explicitArray: false, ignoreAttrs: false });
        const cSld = parsed?.['p:sldMaster']?.['p:cSld'];
        const name = cSld?.$?.name || `Master ${i + 1}`;

        masters.push({
          name,
          index: i,
          layouts: [], // Populated via relationship parsing
        });
      } catch {}
    }

    return masters;
  }

  /**
   * Extract background colour from common slide data.
   */
  private extractBackground(cSld: any): string | undefined {
    try {
      const bg = cSld?.['p:bg'];
      const bgPr = bg?.['p:bgPr'];
      const solidFill = bgPr?.['a:solidFill'];
      return this.extractColor(solidFill);
    } catch {
      return undefined;
    }
  }

  /**
   * Extract hex colour from a solidFill element.
   */
  private extractColor(solidFill: any): string | undefined {
    if (!solidFill) return undefined;
    const srgb = solidFill?.['a:srgbClr'];
    if (srgb?.$?.val) return `#${srgb.$.val}`;
    return undefined;
  }

  // ── Default Values (Professional IB Style) ──

  private getDefaultAnalysis(): TemplateAnalysis {
    return {
      slide_layouts: this.getDefaultLayouts(),
      color_palette: this.getDefaultPalette(),
      fonts: this.getDefaultFonts(),
      master_slides: [],
    };
  }

  private getDefaultPalette(): ColorPalette {
    return {
      primary: '#003366',
      secondary: '#0066CC',
      accent: '#FF6600',
      background: '#FFFFFF',
      text: '#333333',
      colors: ['#003366', '#0066CC', '#336699', '#669ACC', '#99CCE5', '#FF6600', '#333333', '#666666'],
    };
  }

  private getDefaultFonts(): FontSpec[] {
    return [
      { name: 'Calibri', size: 36, bold: true, color: '#003366' },
      { name: 'Calibri', size: 22, bold: true, color: '#003366' },
      { name: 'Calibri', size: 14, color: '#333333' },
      { name: 'Calibri', size: 12, color: '#666666' },
      { name: 'Calibri', size: 10, color: '#999999' },
    ];
  }

  private getDefaultLayouts(): SlideLayout[] {
    return [
      {
        name: 'Title Slide',
        index: 0,
        placeholders: [
          { idx: 0, type: 'title', left: 0.5, top: 2.0, width: 9.0, height: 1.5, font: { name: 'Calibri', size: 36, bold: true } },
          { idx: 1, type: 'subtitle', left: 0.5, top: 3.8, width: 9.0, height: 1.0, font: { name: 'Calibri', size: 18 } },
          { idx: 2, type: 'date', left: 0.5, top: 5.5, width: 4.0, height: 0.5, font: { name: 'Calibri', size: 12 } },
        ],
      },
      {
        name: 'Section Header',
        index: 1,
        placeholders: [
          { idx: 0, type: 'title', left: 0.5, top: 2.5, width: 9.0, height: 1.5, font: { name: 'Calibri', size: 28, bold: true } },
        ],
      },
      {
        name: 'Content Slide',
        index: 2,
        placeholders: [
          { idx: 0, type: 'title', left: 0.5, top: 0.3, width: 9.0, height: 0.8, font: { name: 'Calibri', size: 22, bold: true } },
          { idx: 1, type: 'body', left: 0.5, top: 1.3, width: 9.0, height: 5.0, font: { name: 'Calibri', size: 14 } },
        ],
      },
      {
        name: 'Two Column',
        index: 3,
        placeholders: [
          { idx: 0, type: 'title', left: 0.5, top: 0.3, width: 9.0, height: 0.8, font: { name: 'Calibri', size: 22, bold: true } },
          { idx: 1, type: 'body', left: 0.5, top: 1.3, width: 4.2, height: 5.0, font: { name: 'Calibri', size: 12 } },
          { idx: 2, type: 'body', left: 5.3, top: 1.3, width: 4.2, height: 5.0, font: { name: 'Calibri', size: 12 } },
        ],
      },
      {
        name: 'Financial Table',
        index: 4,
        placeholders: [
          { idx: 0, type: 'title', left: 0.5, top: 0.3, width: 9.0, height: 0.8, font: { name: 'Calibri', size: 22, bold: true } },
          { idx: 1, type: 'table', left: 0.5, top: 1.3, width: 9.0, height: 5.0 },
        ],
      },
      {
        name: 'Chart Slide',
        index: 5,
        placeholders: [
          { idx: 0, type: 'title', left: 0.5, top: 0.3, width: 9.0, height: 0.8, font: { name: 'Calibri', size: 22, bold: true } },
          { idx: 1, type: 'chart', left: 0.5, top: 1.3, width: 9.0, height: 5.0 },
        ],
      },
      {
        name: 'Key Metrics',
        index: 6,
        placeholders: [
          { idx: 0, type: 'title', left: 0.5, top: 0.3, width: 9.0, height: 0.8, font: { name: 'Calibri', size: 22, bold: true } },
          { idx: 1, type: 'body', left: 0.5, top: 1.3, width: 2.8, height: 2.5 },
          { idx: 2, type: 'body', left: 3.6, top: 1.3, width: 2.8, height: 2.5 },
          { idx: 3, type: 'body', left: 6.7, top: 1.3, width: 2.8, height: 2.5 },
        ],
      },
      {
        name: 'Comparison Table',
        index: 7,
        placeholders: [
          { idx: 0, type: 'title', left: 0.5, top: 0.3, width: 9.0, height: 0.8, font: { name: 'Calibri', size: 22, bold: true } },
          { idx: 1, type: 'table', left: 0.5, top: 1.3, width: 9.0, height: 5.0 },
        ],
      },
      {
        name: 'Executive Summary',
        index: 8,
        placeholders: [
          { idx: 0, type: 'title', left: 0.5, top: 0.3, width: 9.0, height: 0.8, font: { name: 'Calibri', size: 22, bold: true } },
          { idx: 1, type: 'body', left: 0.5, top: 1.3, width: 5.5, height: 5.0, font: { name: 'Calibri', size: 13 } },
          { idx: 2, type: 'body', left: 6.3, top: 1.3, width: 3.2, height: 5.0 },
        ],
      },
    ];
  }
}

export const templateAnalyser = new TemplateAnalyserService();
