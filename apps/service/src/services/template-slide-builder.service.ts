import JSZip from 'jszip';
import { parseStringPromise } from 'xml2js';
import type {
  ContentPlan, ContentSlide, SlideData, SlideContent,
} from '@pitchdeck/shared-types';

/**
 * Template Slide Builder Service
 *
 * Clones actual slides from the user's uploaded template and replaces
 * placeholder text using regex on the raw XML (avoids xml2js Builder
 * which corrupts OOXML namespaces/attributes).
 *
 * The template's slides are the best examples of each layout — they
 * have correct backgrounds, shapes, fonts, positions. We clone them
 * and swap out the text content.
 */

interface TemplateSlideInfo {
  file: string;
  relsFile: string;
  layoutName: string;
  layoutFile: string;
  /** Placeholder types found in the slide XML */
  placeholderTypes: string[];
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
    const newSlideFiles: string[] = [];
    const newRelsFiles: string[] = [];

    for (const slidePlan of contentPlan.slides) {
      const templateSlide = this.findBestMatch(slidePlan, templateSlides);
      const newIndex = slidePlan.index + 1; // 1-based
      const newSlideFile = `ppt/slides/slide${newIndex}.xml`;
      const newRelsFile = `ppt/slides/_rels/slide${newIndex}.xml.rels`;

      // Read raw XML of the template slide
      const rawXml = await zip.file(templateSlide.file)?.async('text');
      if (!rawXml) continue;

      // Replace text in placeholders using regex on the raw XML
      const { xml: modifiedXml, contents } = await this.replaceSlideText(rawXml, slidePlan);
      zip.file(newSlideFile, modifiedXml);

      // Copy the rels file (keeps layout/image references intact)
      const relsXml = await zip.file(templateSlide.relsFile)?.async('text');
      if (relsXml) {
        zip.file(newRelsFile, relsXml);
      } else {
        // Build minimal rels pointing to the layout
        const layoutTarget = templateSlide.layoutFile.replace('ppt/', '../');
        zip.file(newRelsFile, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="${layoutTarget}"/></Relationships>`);
      }

      newSlideFiles.push(newSlideFile);
      newRelsFiles.push(newRelsFile);

      slidesData.push({
        index: slidePlan.index,
        title: slidePlan.title,
        layout: slidePlan.layout,
        content: contents,
        notes: slidePlan.talking_points?.join('\n'),
      });
    }

    // ── Phase 3: Update OOXML bookkeeping using regex (no xml2js Builder) ──
    await this.updatePresentationXmlRegex(zip, newSlideFiles);
    await this.updateContentTypesRegex(zip, newSlideFiles);

    // Remove old template slides not reused
    await this.removeOldSlides(zip, templateSlides, newSlideFiles, newRelsFiles);

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

      let layoutFile = '';
      let layoutName = `Layout ${slideNum}`;

      // Find which layout this slide references
      const relsXml = await zip.file(relsFile)?.async('text');
      if (relsXml) {
        const relsParsed = await parseStringPromise(relsXml, { explicitArray: false, ignoreAttrs: false });
        let rels = relsParsed?.Relationships?.Relationship;
        if (rels && !Array.isArray(rels)) rels = [rels];

        for (const rel of (rels || [])) {
          if (rel?.$?.Type?.includes('slideLayout')) {
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

      // Extract placeholder types from the slide
      const placeholderTypes = this.extractPlaceholderTypesFromXml(
        await zip.file(slideFile)?.async('text') || ''
      );

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

  /**
   * Extract placeholder types using regex (no xml2js needed).
   */
  private extractPlaceholderTypesFromXml(xml: string): string[] {
    const types: string[] = [];
    // Match <p:ph .../> or <p:ph ...> elements and extract type attribute
    const phRegex = /<p:ph[^>]*?(?:\/>|>)/g;
    let match;
    while ((match = phRegex.exec(xml)) !== null) {
      const typeMatch = match[0].match(/type="([^"]+)"/);
      types.push(typeMatch ? typeMatch[1] : 'body');
    }
    return types;
  }

  // ──────────────────────────────────────────────
  //  FIND BEST MATCHING TEMPLATE SLIDE
  // ──────────────────────────────────────────────

  private findBestMatch(slidePlan: ContentSlide, templateSlides: TemplateSlideInfo[]): TemplateSlideInfo {
    const planLayout = slidePlan.layout.toLowerCase();

    let bestScore = -1;
    let bestSlide = templateSlides[0];

    for (const ts of templateSlides) {
      let score = 0;
      const layoutLower = ts.layoutName.toLowerCase();

      // Exact layout name match
      if (layoutLower === planLayout) { score += 100; }
      // Partial matches
      else if (layoutLower.includes('title') && planLayout.includes('title') && !planLayout.includes('content')) { score += 80; }
      else if (layoutLower.includes('section') && planLayout.includes('section')) { score += 80; }
      else if (layoutLower.includes('two') && planLayout.includes('two')) { score += 70; }
      else if (layoutLower.includes('comparison') && planLayout.includes('compar')) { score += 70; }
      else if (layoutLower.includes('content') && planLayout.includes('content')) { score += 60; }
      else if (layoutLower.includes('summary') && planLayout.includes('summary')) { score += 80; }
      else if (layoutLower.includes('thank') && planLayout.includes('thank')) { score += 80; }
      else if (layoutLower.includes('timeline') && planLayout.includes('timeline')) { score += 80; }
      else if (layoutLower.includes('team') && planLayout.includes('team')) { score += 80; }
      else if (layoutLower.includes('quote') && planLayout.includes('quote')) { score += 80; }
      // Generic content fallback
      else if (layoutLower.includes('content') && !planLayout.includes('title')) { score += 30; }

      // Placeholder type matching as tiebreaker
      if (ts.placeholderTypes.includes('title') || ts.placeholderTypes.includes('ctrTitle')) score += 5;
      if (ts.placeholderTypes.includes('body') || ts.placeholderTypes.includes('obj')) score += 3;

      // Prefer slides with more placeholders for content-heavy layouts
      if (['Content Slide', 'Executive Summary', 'Two Column', 'Comparison'].includes(slidePlan.layout)) {
        score += ts.placeholderTypes.length;
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
  //  REPLACE TEXT IN SLIDE (using xml2js parse + rebuild per-shape)
  // ──────────────────────────────────────────────

  /**
   * Parse the slide XML, identify placeholders, and replace their text content.
   * We parse with xml2js for reading, then rebuild only the <p:txBody> portions
   * and splice them back into the original raw XML to avoid corrupting the
   * overall slide structure.
   */
  private async replaceSlideText(
    rawXml: string,
    slidePlan: ContentSlide,
  ): Promise<{ xml: string; contents: SlideContent[] }> {
    const contents: SlideContent[] = [];

    // Prepare content
    const headingBlock = (slidePlan.content_blocks || []).find(b => b.type === 'heading');
    const titleText = headingBlock ? String(headingBlock.content) : slidePlan.title;
    const bodyBlocks = (slidePlan.content_blocks || []).filter(b => b.type !== 'heading');
    let bodyIndex = 0;

    // Parse to identify placeholder shapes
    const parsed = await parseStringPromise(rawXml, {
      explicitArray: true,
      ignoreAttrs: false,
      preserveChildrenOrder: true,
    });

    const spTree = parsed?.['p:sld']?.['p:cSld']?.[0]?.['p:spTree']?.[0];
    if (!spTree) return { xml: rawXml, contents };

    const shapes = spTree?.['p:sp'] || [];

    // Build a map of placeholder type → replacement text
    const replacements: { phType: string; text: string; isBulletList: boolean; items: string[] }[] = [];

    for (const sp of shapes) {
      const nvSpPr = sp?.['p:nvSpPr']?.[0];
      const nvPr = nvSpPr?.['p:nvPr']?.[0];
      const ph = nvPr?.['p:ph']?.[0];
      if (!ph) continue;

      const phType = ph?.$?.type || 'body';

      if (phType === 'title' || phType === 'ctrTitle') {
        const trimmed = this.truncate(titleText, 120);
        replacements.push({ phType, text: trimmed, isBulletList: false, items: [] });
        contents.push({ type: 'text', placeholder: 'title', value: trimmed });
      } else if (phType === 'subTitle') {
        const paragraphs = (slidePlan.content_blocks || []).filter(b => b.type === 'paragraph').map(b => String(b.content));
        const subtitleText = this.truncate(paragraphs[0] || slidePlan.talking_points?.[0] || '', 200);
        replacements.push({ phType, text: subtitleText, isBulletList: false, items: [] });
        contents.push({ type: 'text', placeholder: 'subtitle', value: subtitleText });
      } else if (phType === 'body' || phType === 'obj') {
        const block = bodyBlocks[bodyIndex];
        bodyIndex++;

        if (block?.type === 'bullet_list' && Array.isArray(block.content)) {
          // Limit to 7 bullets, each max 150 chars
          const items = block.content.slice(0, 7).map((item: string) => this.truncate(item, 150));
          replacements.push({ phType, text: '', isBulletList: true, items });
          contents.push({ type: 'list', placeholder: 'body', value: items });
        } else if (block?.type === 'table') {
          const tableText = this.tableToCompactText(block.content);
          replacements.push({ phType, text: tableText, isBulletList: false, items: [] });
          contents.push({ type: 'text', placeholder: 'body', value: tableText });
        } else if (block?.type === 'metric') {
          const metricText = `${block.content?.label || ''}: ${block.content?.value || ''}`;
          replacements.push({ phType, text: metricText, isBulletList: false, items: [] });
          contents.push({ type: 'text', placeholder: 'body', value: metricText });
        } else if (block?.type === 'paragraph') {
          const trimmed = this.truncate(String(block.content), 500);
          replacements.push({ phType, text: trimmed, isBulletList: false, items: [] });
          contents.push({ type: 'text', placeholder: 'body', value: trimmed });
        } else {
          // Combine remaining blocks — limit total
          const allText = this.truncate(
            bodyBlocks
              .slice(Math.max(0, bodyIndex - 1))
              .map(b => this.blockToText(b))
              .filter(Boolean)
              .join('\n'),
            600,
          );
          replacements.push({ phType, text: allText, isBulletList: false, items: [] });
          if (allText) contents.push({ type: 'text', placeholder: 'body', value: allText });
          bodyIndex = bodyBlocks.length;
        }
      } else if (phType === 'dt') {
        const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        replacements.push({ phType, text: dateStr, isBulletList: false, items: [] });
      } else if (phType === 'ftr') {
        replacements.push({ phType, text: 'CONFIDENTIAL', isBulletList: false, items: [] });
      }
      // sldNum — skip, leave as-is
    }

    // Now do the actual text replacement on the raw XML
    let modifiedXml = rawXml;
    let replacementIndex = 0;

    // Find each <p:sp> block that contains a placeholder and replace its <p:txBody>
    // We use a regex to find <p:sp> blocks containing <p:ph
    modifiedXml = modifiedXml.replace(
      /(<p:sp\b[^>]*>)([\s\S]*?)(<\/p:sp>)/g,
      (fullMatch, openTag, inner, closeTag) => {
        // Check if this shape has a placeholder
        const phMatch = inner.match(/<p:ph[^>]*?\/?>/);
        if (!phMatch) return fullMatch; // Not a placeholder, leave as-is

        // Determine placeholder type
        const typeMatch = phMatch[0].match(/type="([^"]+)"/);
        const phType = typeMatch ? typeMatch[1] : 'body';

        // Find the matching replacement
        const replacement = replacements[replacementIndex];
        if (!replacement) return fullMatch;

        // Only consume if the types match (or close enough)
        if (this.phTypesMatch(phType, replacement.phType)) {
          replacementIndex++;

          // Replace the <p:txBody>...</p:txBody> with new text content
          const newTxBody = replacement.isBulletList
            ? this.buildTxBodyBullets(inner, replacement.items)
            : this.buildTxBodyText(inner, replacement.text);

          const modifiedInner = inner.replace(
            /<p:txBody>[\s\S]*?<\/p:txBody>/,
            newTxBody,
          );

          return openTag + modifiedInner + closeTag;
        }

        return fullMatch;
      },
    );

    return { xml: modifiedXml, contents };
  }

  private phTypesMatch(xmlType: string, replacementType: string): boolean {
    if (xmlType === replacementType) return true;
    // title and ctrTitle are both "title" replacements
    if ((xmlType === 'title' || xmlType === 'ctrTitle') && (replacementType === 'title' || replacementType === 'ctrTitle')) return true;
    // body and obj are interchangeable
    if ((xmlType === 'body' || xmlType === 'obj') && (replacementType === 'body' || replacementType === 'obj')) return true;
    return false;
  }

  /**
   * Build a new <p:txBody> element preserving the original bodyPr and lstStyle,
   * but replacing all paragraph content with the given text.
   */
  private buildTxBodyText(shapeInner: string, text: string): string {
    const bodyPrMatch = shapeInner.match(/<a:bodyPr[^>]*?\/>|<a:bodyPr[^>]*?>[\s\S]*?<\/a:bodyPr>/);
    const lstStyleMatch = shapeInner.match(/<a:lstStyle\s*\/>|<a:lstStyle[^>]*?>[\s\S]*?<\/a:lstStyle>/);
    const rPrMatch = shapeInner.match(/<a:rPr[^>]*?\/>|<a:rPr[^>]*?>[\s\S]*?<\/a:rPr>/);
    const rPr = rPrMatch ? rPrMatch[0] : '<a:rPr lang="en-US" dirty="0"/>';
    const pPrMatch = shapeInner.match(/<a:pPr[^>]*?\/>|<a:pPr[^>]*?>[\s\S]*?<\/a:pPr>/);

    const bodyPr = this.ensureAutoFit(bodyPrMatch ? bodyPrMatch[0] : '<a:bodyPr/>');
    const lstStyle = lstStyleMatch ? lstStyleMatch[0] : '<a:lstStyle/>';
    const pPr = pPrMatch ? pPrMatch[0] : '';

    const lines = text.split('\n').filter(l => l.trim());

    if (lines.length === 0) {
      return `<p:txBody>${bodyPr}${lstStyle}<a:p>${pPr}<a:endParaRPr lang="en-US"/></a:p></p:txBody>`;
    }

    const paragraphs = lines.map(line =>
      `<a:p>${pPr}<a:r>${rPr}<a:t>${this.escapeXml(line)}</a:t></a:r></a:p>`
    ).join('');

    return `<p:txBody>${bodyPr}${lstStyle}${paragraphs}</p:txBody>`;
  }

  /**
   * Build a <p:txBody> with bullet list items, preserving original bodyPr/lstStyle.
   */
  private buildTxBodyBullets(shapeInner: string, items: string[]): string {
    const bodyPrMatch = shapeInner.match(/<a:bodyPr[^>]*?\/>|<a:bodyPr[^>]*?>[\s\S]*?<\/a:bodyPr>/);
    const lstStyleMatch = shapeInner.match(/<a:lstStyle\s*\/>|<a:lstStyle[^>]*?>[\s\S]*?<\/a:lstStyle>/);
    const rPrMatch = shapeInner.match(/<a:rPr[^>]*?\/>|<a:rPr[^>]*?>[\s\S]*?<\/a:rPr>/);
    const pPrMatch = shapeInner.match(/<a:pPr[^>]*?\/>|<a:pPr[^>]*?>[\s\S]*?<\/a:pPr>/);

    const bodyPr = this.ensureAutoFit(bodyPrMatch ? bodyPrMatch[0] : '<a:bodyPr/>');
    const lstStyle = lstStyleMatch ? lstStyleMatch[0] : '<a:lstStyle/>';
    const rPr = rPrMatch ? rPrMatch[0] : '<a:rPr lang="en-US" dirty="0"/>';
    const pPr = pPrMatch ? pPrMatch[0] : '';

    const paragraphs = items.map(item =>
      `<a:p>${pPr}<a:r>${rPr}<a:t>${this.escapeXml(item)}</a:t></a:r></a:p>`
    ).join('');

    return `<p:txBody>${bodyPr}${lstStyle}${paragraphs}</p:txBody>`;
  }

  /**
   * Ensure <a:bodyPr> has auto-fit enabled so PowerPoint shrinks text to fit.
   * If it already has normAutofit or spAutoFit, leave it. Otherwise inject normAutofit.
   */
  private ensureAutoFit(bodyPr: string): string {
    // Already has auto-fit
    if (bodyPr.includes('normAutofit') || bodyPr.includes('spAutoFit')) {
      return bodyPr;
    }

    // Self-closing <a:bodyPr .../> → convert to open/close with normAutofit child
    if (bodyPr.match(/<a:bodyPr[^>]*?\/>/)) {
      return bodyPr.replace('/>', '><a:normAutofit fontScale="50000" lnSpcReduction="20000"/></a:bodyPr>');
    }

    // Open/close <a:bodyPr ...>...</a:bodyPr> → inject normAutofit before closing tag
    return bodyPr.replace('</a:bodyPr>', '<a:normAutofit fontScale="50000" lnSpcReduction="20000"/></a:bodyPr>');
  }

  // ──────────────────────────────────────────────
  //  OOXML BOOKKEEPING (regex-based, no xml2js Builder)
  // ──────────────────────────────────────────────

  /**
   * Update presentation.xml and its .rels file using regex to avoid
   * xml2js Builder corrupting the XML structure.
   */
  private async updatePresentationXmlRegex(
    zip: JSZip,
    newSlideFiles: string[],
  ) {
    // ── Update presentation.xml.rels ──
    const presRelsFile = 'ppt/_rels/presentation.xml.rels';
    let presRelsXml = await zip.file(presRelsFile)?.async('text');
    if (!presRelsXml) return;

    // Find max existing rId
    let maxRId = 0;
    const rIdRegex = /Id="rId(\d+)"/g;
    let match;
    while ((match = rIdRegex.exec(presRelsXml)) !== null) {
      maxRId = Math.max(maxRId, parseInt(match[1]));
    }

    // Remove existing slide relationships
    presRelsXml = presRelsXml.replace(
      /<Relationship[^>]*Type="[^"]*\/relationships\/slide"[^>]*\/>/g,
      '',
    );

    // Build new slide relationship entries
    const newRels: string[] = [];
    const rIdMap: { file: string; rId: string }[] = [];

    for (let i = 0; i < newSlideFiles.length; i++) {
      const rId = `rId${maxRId + i + 1}`;
      const target = newSlideFiles[i].replace('ppt/', '');
      newRels.push(`<Relationship Id="${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="${target}"/>`);
      rIdMap.push({ file: newSlideFiles[i], rId });
    }

    // Insert new rels before closing </Relationships>
    presRelsXml = presRelsXml.replace(
      '</Relationships>',
      newRels.join('') + '</Relationships>',
    );

    // Clean up empty lines from removed rels
    presRelsXml = presRelsXml.replace(/\n\s*\n/g, '\n');

    zip.file(presRelsFile, presRelsXml);

    // ── Update presentation.xml ──
    let presXml = await zip.file('ppt/presentation.xml')?.async('text');
    if (!presXml) return;

    // Find max existing slide ID
    let maxSlideId = 256;
    const sldIdRegex = /id="(\d+)"/g;
    // Only look inside sldIdLst
    const sldIdLstMatch = presXml.match(/<p:sldIdLst>([\s\S]*?)<\/p:sldIdLst>/);
    if (sldIdLstMatch) {
      while ((match = sldIdRegex.exec(sldIdLstMatch[1])) !== null) {
        maxSlideId = Math.max(maxSlideId, parseInt(match[1]));
      }
    }

    // Build new sldIdLst content
    const sldIdEntries = rIdMap.map((entry, i) => {
      const slideId = maxSlideId + i + 1;
      return `<p:sldId id="${slideId}" r:id="${entry.rId}"/>`;
    }).join('');

    const newSldIdLst = `<p:sldIdLst>${sldIdEntries}</p:sldIdLst>`;

    // Replace existing sldIdLst or insert before first closing tag after sldMasterIdLst
    if (presXml.includes('<p:sldIdLst>') || presXml.includes('<p:sldIdLst ')) {
      presXml = presXml.replace(
        /<p:sldIdLst[^>]*>[\s\S]*?<\/p:sldIdLst>/,
        newSldIdLst,
      );
    } else if (presXml.includes('</p:sldMasterIdLst>')) {
      presXml = presXml.replace(
        '</p:sldMasterIdLst>',
        `</p:sldMasterIdLst>${newSldIdLst}`,
      );
    }

    zip.file('ppt/presentation.xml', presXml);
  }

  /**
   * Update [Content_Types].xml using regex.
   */
  private async updateContentTypesRegex(
    zip: JSZip,
    newSlideFiles: string[],
  ) {
    let ctXml = await zip.file('[Content_Types].xml')?.async('text');
    if (!ctXml) return;

    // Remove existing slide overrides
    ctXml = ctXml.replace(
      /<Override[^>]*PartName="\/ppt\/slides\/slide\d+\.xml"[^>]*\/>/g,
      '',
    );

    // Build new overrides
    const overrides = newSlideFiles.map(f =>
      `<Override PartName="/${f}" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`
    ).join('');

    // Insert before closing </Types>
    ctXml = ctXml.replace('</Types>', overrides + '</Types>');

    // Clean up empty lines
    ctXml = ctXml.replace(/\n\s*\n/g, '\n');

    zip.file('[Content_Types].xml', ctXml);
  }

  // ──────────────────────────────────────────────
  //  REMOVE OLD SLIDES
  // ──────────────────────────────────────────────

  private async removeOldSlides(
    zip: JSZip,
    templateSlides: TemplateSlideInfo[],
    newSlideFiles: string[],
    newRelsFiles: string[],
  ) {
    const keepFiles = new Set([...newSlideFiles, ...newRelsFiles]);

    for (const ts of templateSlides) {
      if (!keepFiles.has(ts.file)) {
        zip.remove(ts.file);
      }
      if (!keepFiles.has(ts.relsFile)) {
        zip.remove(ts.relsFile);
      }
    }
  }

  // ──────────────────────────────────────────────
  //  HELPERS
  // ──────────────────────────────────────────────

  private truncate(text: string, maxLen: number): string {
    if (text.length <= maxLen) return text;
    return text.slice(0, maxLen - 1) + '\u2026'; // ellipsis
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
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

  /**
   * Convert table to compact text for body placeholders.
   * Limits rows and column widths to fit in a text placeholder.
   */
  private tableToCompactText(tableContent: any): string {
    if (!tableContent) return '';
    const { headers, rows } = tableContent;
    const lines: string[] = [];
    const maxRows = 8;
    const maxColWidth = 25;

    const trimCol = (val: string) => {
      const s = String(val || '').trim();
      return s.length > maxColWidth ? s.slice(0, maxColWidth - 1) + '\u2026' : s;
    };

    if (headers) {
      lines.push(headers.map(trimCol).join('  |  '));
    }
    for (const row of (rows || []).slice(0, maxRows)) {
      lines.push(row.map(trimCol).join('  |  '));
    }
    if ((rows || []).length > maxRows) {
      lines.push(`... and ${rows.length - maxRows} more rows`);
    }
    return lines.join('\n');
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
