import JSZip from 'jszip';
import { parseStringPromise, Builder } from 'xml2js';
import type {
  ContentPlan, ContentSlide, SlideData, SlideContent,
} from '@pitchdeck/shared-types';

/**
 * Template Slide Builder Service
 *
 * Builds presentations by cloning slides from the user's uploaded template
 * and replacing placeholder text. This preserves ALL visual styling:
 * backgrounds, gradients, shapes, fonts, colors, images, effects.
 *
 * Approach:
 * 1. Load the template PPTX as a ZIP
 * 2. Parse slide → layout mapping to understand each slide's type
 * 3. For each content plan slide, clone the best-matching template slide
 * 4. Replace text in placeholders while preserving formatting
 * 5. Update OOXML bookkeeping (presentation.xml, content types, rels)
 */

const xmlBuilder = new Builder({
  headless: false,
  renderOpts: { pretty: false },
  xmldec: { version: '1.0', encoding: 'UTF-8', standalone: true },
});

interface TemplateSlideInfo {
  /** e.g. 'ppt/slides/slide1.xml' */
  file: string;
  /** e.g. 'ppt/slides/_rels/slide1.xml.rels' */
  relsFile: string;
  /** Layout name from the referenced slideLayout */
  layoutName: string;
  /** Layout file path */
  layoutFile: string;
  /** Placeholder types found in this slide */
  placeholderTypes: string[];
  /** Slide index in the template (1-based) */
  index: number;
}

export class TemplateSlideBuilderService {

  async buildFromTemplate(
    templateBuffer: Buffer,
    contentPlan: ContentPlan,
  ): Promise<{ buffer: Buffer; slidesData: SlideData[] }> {
    const zip = await JSZip.loadAsync(templateBuffer);

    // ── Phase 1: Parse template structure ──
    const templateSlides = await this.parseTemplateStructure(zip);

    if (templateSlides.length === 0) {
      throw new Error('Template has no slides to clone');
    }

    console.log(`[TemplateSlideBuilder] Template has ${templateSlides.length} slides: ${
      templateSlides.map(s => s.layoutName).join(', ')
    }`);

    // ── Phase 2: Clone slides and replace text ──
    const slidesData: SlideData[] = [];

    // Collect new slide entries for OOXML bookkeeping
    const newSlides: { file: string; relsFile: string; relsContent: string }[] = [];

    for (const slidePlan of contentPlan.slides) {
      const templateSlide = this.findBestMatch(slidePlan, templateSlides);
      const newIndex = slidePlan.index + 1; // 1-based
      const newSlideFile = `ppt/slides/slide${newIndex}.xml`;
      const newRelsFile = `ppt/slides/_rels/slide${newIndex}.xml.rels`;

      // Read template slide XML and modify it
      const slideXml = await zip.file(templateSlide.file)?.async('text');
      if (!slideXml) continue;

      const { xml: modifiedXml, contents } = await this.populateSlide(slideXml, slidePlan);
      zip.file(newSlideFile, modifiedXml);

      // Copy the rels file (keeps layout reference intact)
      const relsXml = await zip.file(templateSlide.relsFile)?.async('text');
      const relsContent = relsXml || this.buildMinimalRels(templateSlide.layoutFile);
      zip.file(newRelsFile, relsContent);

      newSlides.push({ file: newSlideFile, relsFile: newRelsFile, relsContent });

      slidesData.push({
        index: slidePlan.index,
        title: slidePlan.title,
        layout: slidePlan.layout,
        content: contents,
        notes: slidePlan.talking_points?.join('\n'),
      });
    }

    // ── Phase 3: Update OOXML bookkeeping ──
    await this.updatePresentationXml(zip, newSlides);
    await this.updateContentTypes(zip, newSlides);

    // Remove old template slides that aren't reused
    await this.removeOldSlides(zip, templateSlides, newSlides);

    const buffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    return { buffer: buffer as Buffer, slidesData };
  }

  // ──────────────────────────────────────────────
  //  PARSE TEMPLATE STRUCTURE
  // ──────────────────────────────────────────────

  private async parseTemplateStructure(zip: JSZip): Promise<TemplateSlideInfo[]> {
    const slides: TemplateSlideInfo[] = [];

    // Get slide files sorted by number
    const slideFiles = Object.keys(zip.files)
      .filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f))
      .sort((a, b) => {
        const numA = parseInt(a.match(/slide(\d+)/)?.[1] || '0');
        const numB = parseInt(b.match(/slide(\d+)/)?.[1] || '0');
        return numA - numB;
      });

    for (const slideFile of slideFiles) {
      const slideNum = parseInt(slideFile.match(/slide(\d+)/)?.[1] || '0');
      const relsFile = `ppt/slides/_rels/slide${slideNum}.xml.rels`;

      // Find which layout this slide references
      let layoutFile = '';
      let layoutName = `Layout ${slideNum}`;

      const relsXml = await zip.file(relsFile)?.async('text');
      if (relsXml) {
        const relsParsed = await parseStringPromise(relsXml, { explicitArray: false, ignoreAttrs: false });
        let rels = relsParsed?.Relationships?.Relationship;
        if (rels && !Array.isArray(rels)) rels = [rels];

        for (const rel of (rels || [])) {
          if (rel?.$?.Type?.includes('slideLayout')) {
            // Target is relative: ../slideLayouts/slideLayout1.xml
            const target = rel.$.Target;
            layoutFile = target.startsWith('../')
              ? `ppt/${target.replace('../', '')}`
              : target;
            break;
          }
        }
      }

      // Parse layout to get its name
      if (layoutFile) {
        try {
          const layoutXml = await zip.file(layoutFile)?.async('text');
          if (layoutXml) {
            const layoutParsed = await parseStringPromise(layoutXml, { explicitArray: false, ignoreAttrs: false });
            const cSld = layoutParsed?.['p:sldLayout']?.['p:cSld'];
            layoutName = cSld?.$?.name || layoutParsed?.['p:sldLayout']?.$?.type || layoutName;
          }
        } catch { /* use default name */ }
      }

      // Parse slide to find placeholder types
      const placeholderTypes = await this.extractPlaceholderTypes(zip, slideFile);

      slides.push({
        file: slideFile,
        relsFile,
        layoutName,
        layoutFile,
        placeholderTypes,
        index: slideNum,
      });
    }

    return slides;
  }

  private async extractPlaceholderTypes(zip: JSZip, slideFile: string): Promise<string[]> {
    const types: string[] = [];
    try {
      const xml = await zip.file(slideFile)?.async('text');
      if (!xml) return types;

      const parsed = await parseStringPromise(xml, { explicitArray: true, ignoreAttrs: false });
      const spTree = parsed?.['p:sld']?.['p:cSld']?.[0]?.['p:spTree']?.[0];
      const shapes = spTree?.['p:sp'] || [];

      for (const sp of shapes) {
        const ph = sp?.['p:nvSpPr']?.[0]?.['p:nvPr']?.[0]?.['p:ph']?.[0];
        if (ph?.$?.type) {
          types.push(ph.$.type);
        } else if (ph) {
          types.push('body'); // Default placeholder type
        }
      }
    } catch { /* skip */ }
    return types;
  }

  // ──────────────────────────────────────────────
  //  FIND BEST MATCHING TEMPLATE SLIDE
  // ──────────────────────────────────────────────

  private findBestMatch(slidePlan: ContentSlide, templateSlides: TemplateSlideInfo[]): TemplateSlideInfo {
    const planLayout = slidePlan.layout.toLowerCase();

    // Score each template slide
    let bestScore = -1;
    let bestSlide = templateSlides[0];

    for (const ts of templateSlides) {
      let score = 0;
      const layoutLower = ts.layoutName.toLowerCase();

      // Exact layout name match
      if (layoutLower === planLayout) { score += 100; }
      // Partial matches
      else if (layoutLower.includes('title') && planLayout.includes('title')) { score += 80; }
      else if (layoutLower.includes('section') && planLayout.includes('section')) { score += 80; }
      else if (layoutLower.includes('two') && planLayout.includes('two')) { score += 70; }
      else if (layoutLower.includes('comparison') && planLayout.includes('compar')) { score += 70; }
      else if (layoutLower.includes('content') && !planLayout.includes('title')) { score += 30; }
      // Placeholder type matching
      else {
        if (ts.placeholderTypes.includes('title') && planLayout !== 'title slide') score += 10;
        if (ts.placeholderTypes.includes('body')) score += 5;
      }

      // Prefer slides with more placeholders for content-heavy layouts
      if (['Content Slide', 'Executive Summary', 'Two Column'].includes(slidePlan.layout)) {
        score += ts.placeholderTypes.length * 2;
      }

      if (score > bestScore) {
        bestScore = score;
        bestSlide = ts;
      }
    }

    console.log(`[TemplateSlideBuilder] Matched "${slidePlan.layout}" → template slide "${bestSlide.layoutName}" (score: ${bestScore})`);
    return bestSlide;
  }

  // ──────────────────────────────────────────────
  //  POPULATE SLIDE — Replace placeholder text
  // ──────────────────────────────────────────────

  private async populateSlide(
    slideXml: string,
    slidePlan: ContentSlide,
  ): Promise<{ xml: string; contents: SlideContent[] }> {
    const contents: SlideContent[] = [];

    // Parse with explicitArray: true for consistent array handling
    const parsed = await parseStringPromise(slideXml, {
      explicitArray: true,
      ignoreAttrs: false,
      preserveChildrenOrder: true,
    });

    const spTree = parsed?.['p:sld']?.['p:cSld']?.[0]?.['p:spTree']?.[0];
    if (!spTree) {
      return { xml: slideXml, contents };
    }

    const shapes = spTree?.['p:sp'] || [];
    let bodyIndex = 0; // Track which body placeholder we're on

    // Prepare content blocks for body placeholders
    const bodyBlocks = (slidePlan.content_blocks || []).filter(b => b.type !== 'heading');

    for (const sp of shapes) {
      const nvSpPr = sp?.['p:nvSpPr']?.[0];
      const nvPr = nvSpPr?.['p:nvPr']?.[0];
      const ph = nvPr?.['p:ph']?.[0];

      if (!ph) continue; // Not a placeholder

      const phType = ph?.$?.type || 'body';
      const txBody = sp?.['p:txBody']?.[0];
      if (!txBody) continue;

      if (phType === 'title' || phType === 'ctrTitle') {
        // Replace title text
        const titleText = this.getBlockContent(slidePlan, 'heading') || slidePlan.title;
        this.replaceTextInTxBody(txBody, titleText);
        contents.push({ type: 'text', placeholder: 'title', value: titleText });
      } else if (phType === 'subTitle') {
        // Replace subtitle
        const paragraphs = this.getAllBlockContent(slidePlan, 'paragraph');
        const subtitleText = paragraphs[0] || slidePlan.talking_points?.[0] || '';
        this.replaceTextInTxBody(txBody, subtitleText);
        contents.push({ type: 'text', placeholder: 'subtitle', value: subtitleText });
      } else if (phType === 'body' || phType === 'obj') {
        // Replace body content
        const block = bodyBlocks[bodyIndex];
        bodyIndex++;

        if (block?.type === 'bullet_list' && Array.isArray(block.content)) {
          this.replaceBulletList(txBody, block.content);
          contents.push({ type: 'list', placeholder: 'body', value: block.content });
        } else if (block?.type === 'paragraph') {
          this.replaceTextInTxBody(txBody, String(block.content));
          contents.push({ type: 'text', placeholder: 'body', value: String(block.content) });
        } else if (block?.type === 'table') {
          // Tables can't go in text placeholders — render as text
          const tableText = this.tableToText(block.content);
          this.replaceTextInTxBody(txBody, tableText);
          contents.push({ type: 'text', placeholder: 'body', value: tableText });
        } else if (block?.type === 'metric') {
          const metricText = `${block.content?.label || ''}: ${block.content?.value || ''}`;
          this.replaceTextInTxBody(txBody, metricText);
          contents.push({ type: 'text', placeholder: 'body', value: metricText });
        } else {
          // Combine remaining content
          const allText = bodyBlocks
            .slice(bodyIndex - 1)
            .map(b => this.blockToText(b))
            .filter(Boolean)
            .join('\n\n');
          if (allText) {
            this.replaceTextInTxBody(txBody, allText);
            contents.push({ type: 'text', placeholder: 'body', value: allText });
          }
          bodyIndex = bodyBlocks.length; // Don't process remaining
        }
      } else if (phType === 'dt') {
        // Date placeholder
        const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        this.replaceTextInTxBody(txBody, dateStr);
      } else if (phType === 'ftr') {
        // Footer — keep or set to confidential
        this.replaceTextInTxBody(txBody, 'CONFIDENTIAL');
      }
      // sldNum — leave as-is (auto slide number)
    }

    // If we have remaining body content and no more placeholders, try to put it
    // in the last body placeholder (append)
    // For MVP, we just skip — the content planner should match slide count

    const xml = xmlBuilder.buildObject(parsed);
    return { xml, contents };
  }

  /**
   * Replace all text in a txBody with a single string, preserving the
   * formatting of the first run.
   */
  private replaceTextInTxBody(txBody: any, text: string) {
    const paragraphs = txBody['a:p'];
    if (!paragraphs || paragraphs.length === 0) return;

    // Get formatting from the first paragraph's first run
    const firstPara = paragraphs[0];
    const templateRun = this.getFirstRun(firstPara);
    const templatePPr = firstPara['a:pPr']?.[0]; // Paragraph properties

    // Split text by newlines for multi-paragraph content
    const lines = text.split('\n').filter(l => l.trim());

    const newParagraphs = lines.map(line => {
      const para: any = {};

      // Preserve paragraph properties (alignment, spacing, etc.)
      if (templatePPr) {
        para['a:pPr'] = [{ ...templatePPr }];
      }

      // Create run with preserved formatting
      const run: any = {};
      if (templateRun?.['a:rPr']?.[0]) {
        // Clone run properties (font, size, color, bold, etc.)
        run['a:rPr'] = [{ ...templateRun['a:rPr'][0] }];
      }
      run['a:t'] = [line];
      para['a:r'] = [run];

      return para;
    });

    // Add an end paragraph marker if needed
    if (newParagraphs.length === 0) {
      newParagraphs.push({ 'a:endParaRPr': [{ $: { lang: 'en-US' } }] });
    }

    txBody['a:p'] = newParagraphs;
  }

  /**
   * Replace body content with a bullet list, preserving the formatting
   * of the first paragraph for each bullet.
   */
  private replaceBulletList(txBody: any, items: string[]) {
    const paragraphs = txBody['a:p'];
    if (!paragraphs || paragraphs.length === 0) return;

    // Get template formatting from the first paragraph
    const firstPara = paragraphs[0];
    const templateRun = this.getFirstRun(firstPara);
    const templatePPr = firstPara['a:pPr']?.[0];

    const newParagraphs = items.map(item => {
      const para: any = {};

      // Preserve paragraph properties (bullet style, indentation, etc.)
      if (templatePPr) {
        para['a:pPr'] = [{ ...templatePPr }];
      }

      // Create run with preserved formatting
      const run: any = {};
      if (templateRun?.['a:rPr']?.[0]) {
        run['a:rPr'] = [{ ...templateRun['a:rPr'][0] }];
      }
      run['a:t'] = [item];
      para['a:r'] = [run];

      return para;
    });

    txBody['a:p'] = newParagraphs;
  }

  private getFirstRun(para: any): any {
    const runs = para?.['a:r'];
    if (runs && runs.length > 0) return runs[0];
    return null;
  }

  // ──────────────────────────────────────────────
  //  OOXML BOOKKEEPING
  // ──────────────────────────────────────────────

  private async updatePresentationXml(
    zip: JSZip,
    newSlides: { file: string; relsFile: string; relsContent: string }[],
  ) {
    const presXml = await zip.file('ppt/presentation.xml')?.async('text');
    if (!presXml) return;

    const parsed = await parseStringPromise(presXml, {
      explicitArray: true,
      ignoreAttrs: false,
    });

    const presentation = parsed['p:presentation'];
    if (!presentation) return;

    // Also update presentation.xml.rels
    const presRelsFile = 'ppt/_rels/presentation.xml.rels';
    const presRelsXml = await zip.file(presRelsFile)?.async('text');
    if (!presRelsXml) return;

    const relsParsed = await parseStringPromise(presRelsXml, {
      explicitArray: true,
      ignoreAttrs: false,
    });

    const relationships = relsParsed['Relationships'];
    let rels = relationships?.['Relationship'] || [];

    // Find existing max rId number
    let maxRId = 0;
    for (const rel of rels) {
      const match = rel?.$?.Id?.match(/rId(\d+)/);
      if (match) maxRId = Math.max(maxRId, parseInt(match[1]));
    }

    // Find existing max slide ID
    let maxSlideId = 256; // OOXML convention starts around 256
    const sldIdLst = presentation['p:sldIdLst']?.[0];
    const existingSldIds = sldIdLst?.['p:sldId'] || [];
    for (const sld of existingSldIds) {
      const id = parseInt(sld?.$?.id || '0');
      if (id > maxSlideId) maxSlideId = id;
    }

    // Build new slide ID list and relationships
    const newSldIds: any[] = [];
    const newRels: any[] = [];

    for (let i = 0; i < newSlides.length; i++) {
      const rId = `rId${maxRId + i + 1}`;
      const slideId = maxSlideId + i + 1;
      const slideTarget = newSlides[i].file.replace('ppt/', '');

      newSldIds.push({
        $: {
          id: String(slideId),
          'r:id': rId,
        },
      });

      newRels.push({
        $: {
          Id: rId,
          Type: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide',
          Target: slideTarget,
        },
      });
    }

    // Replace slide ID list (remove old, add new)
    if (sldIdLst) {
      sldIdLst['p:sldId'] = newSldIds;
    } else {
      presentation['p:sldIdLst'] = [{ 'p:sldId': newSldIds }];
    }

    // Remove old slide relationships, add new ones
    rels = rels.filter((r: any) =>
      !r?.$?.Type?.includes('/relationships/slide'),
    );
    rels.push(...newRels);
    relationships['Relationship'] = rels;

    // Write back
    zip.file('ppt/presentation.xml', xmlBuilder.buildObject(parsed));
    zip.file(presRelsFile, xmlBuilder.buildObject(relsParsed));
  }

  private async updateContentTypes(
    zip: JSZip,
    newSlides: { file: string }[],
  ) {
    const ctXml = await zip.file('[Content_Types].xml')?.async('text');
    if (!ctXml) return;

    const parsed = await parseStringPromise(ctXml, {
      explicitArray: true,
      ignoreAttrs: false,
    });

    const types = parsed['Types'];
    if (!types) return;

    let overrides = types['Override'] || [];

    // Remove old slide overrides
    overrides = overrides.filter((o: any) =>
      !o?.$?.PartName?.match(/^\/ppt\/slides\/slide\d+\.xml$/),
    );

    // Add new slide overrides
    for (const slide of newSlides) {
      overrides.push({
        $: {
          PartName: `/${slide.file}`,
          ContentType: 'application/vnd.openxmlformats-officedocument.presentationml.slide+xml',
        },
      });
    }

    types['Override'] = overrides;
    zip.file('[Content_Types].xml', xmlBuilder.buildObject(parsed));
  }

  private async removeOldSlides(
    zip: JSZip,
    templateSlides: TemplateSlideInfo[],
    newSlides: { file: string; relsFile: string }[],
  ) {
    const newFiles = new Set(newSlides.map(s => s.file));
    const newRelsFiles = new Set(newSlides.map(s => s.relsFile));

    for (const ts of templateSlides) {
      if (!newFiles.has(ts.file)) {
        zip.remove(ts.file);
      }
      if (!newRelsFiles.has(ts.relsFile)) {
        zip.remove(ts.relsFile);
      }
    }
  }

  // ──────────────────────────────────────────────
  //  HELPERS
  // ──────────────────────────────────────────────

  private buildMinimalRels(layoutFile: string): string {
    const target = layoutFile.replace('ppt/', '../');
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="${target}"/>
</Relationships>`;
  }

  private getBlockContent(plan: ContentSlide, type: string): string | null {
    const b = (plan.content_blocks || []).find(b => b.type === type);
    return b ? String(b.content) : null;
  }

  private getAllBlockContent(plan: ContentSlide, type: string): string[] {
    return (plan.content_blocks || []).filter(b => b.type === type).map(b => String(b.content));
  }

  private blockToText(block: any): string {
    if (!block) return '';
    if (block.type === 'paragraph') return String(block.content);
    if (block.type === 'bullet_list' && Array.isArray(block.content)) {
      return block.content.map((item: string) => `• ${item}`).join('\n');
    }
    if (block.type === 'metric') {
      return `${block.content?.label || ''}: ${block.content?.value || ''}`;
    }
    if (block.type === 'table') return this.tableToText(block.content);
    return String(block.content || '');
  }

  private tableToText(tableContent: any): string {
    if (!tableContent) return '';
    const { headers, rows } = tableContent;
    const lines: string[] = [];
    if (headers) lines.push(headers.join(' | '));
    if (headers) lines.push(headers.map(() => '---').join(' | '));
    for (const row of (rows || [])) {
      lines.push(row.join(' | '));
    }
    return lines.join('\n');
  }
}

export const templateSlideBuilder = new TemplateSlideBuilderService();
