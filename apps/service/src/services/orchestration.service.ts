import type { PitchBook, Generation, CreatePitchBookRequest } from '@pitchdeck/shared-types';
import { v4 as uuid } from 'uuid';
import yahooFinance from 'yahoo-finance2';
import { supabaseAdmin } from '../lib/supabase';
import { templateAnalyser } from './template-analyser.service';
import { dataRetrieval } from './data-retrieval.service';
import { contentPlanner } from './content-planner.service';
import { slideBuilder } from './slide-builder.service';
import { templateSlideBuilder } from './template-slide-builder.service';
import { pptxPreview } from './pptx-preview.service';
import env from '../config/env';

/**
 * Orchestration Service
 *
 * Coordinates the multi-step generation workflow:
 * 1. Analyse template (or use defaults)
 * 2. Fetch company data (Yahoo Finance, SEC EDGAR, news)
 * 3. Plan content with LLM
 * 4. Build slides
 * 5. Store result
 */
export class OrchestrationService {

  /**
   * Execute the full pitch book generation pipeline.
   */
  async generatePitchBook(userId: string, request: CreatePitchBookRequest): Promise<PitchBook> {
    const pitchBookId = uuid();
    const generationId = uuid();

    // Create pitch book record
    const { data: pitchBook, error: pbError } = await supabaseAdmin
      .from('pitch_books')
      .insert({
        id: pitchBookId,
        user_id: userId,
        title: request.title,
        company: request.company,
        ticker: request.ticker,
        transaction_type: request.transaction_type,
        pb_type: request.pb_type,
        status: 'generating',
        slides_data: [],
        additional_context: request.additional_context,
      })
      .select()
      .single();

    if (pbError) throw new Error(`Failed to create pitch book: ${pbError.message}`);

    // Create generation record
    await supabaseAdmin.from('generations').insert({
      id: generationId,
      pitch_book_id: pitchBookId,
      status: 'queued',
      progress: 0,
      started_at: new Date().toISOString(),
    });

    // Run pipeline asynchronously
    this.runPipeline(pitchBookId, generationId, userId, request).catch(err => {
      console.error(`[Orchestration] Pipeline failed for ${pitchBookId}:`, err);
    });

    return pitchBook;
  }

  private async runPipeline(
    pitchBookId: string,
    generationId: string,
    userId: string,
    request: CreatePitchBookRequest,
  ) {
    try {
      // Step 1: Analyse template
      await this.updateGeneration(generationId, 'analyzing_template', 10, 'Analysing template...');

      let templateAnalysis;
      let templateBuffer: Buffer | null = null;

      if (request.template_id) {
        const { data: template } = await supabaseAdmin
          .from('templates')
          .select('*')
          .eq('id', request.template_id)
          .single();

        if (template?.analysis_data) {
          templateAnalysis = template.analysis_data;
        }

        // Download the original template PPTX for template-based slide building
        if (template?.file_url) {
          try {
            const res = await fetch(template.file_url, { signal: AbortSignal.timeout(30000) });
            if (res.ok) {
              templateBuffer = Buffer.from(await res.arrayBuffer());
              console.log(`[Orchestration] Downloaded template PPTX (${(templateBuffer.length / 1024).toFixed(0)}KB)`);
            }
          } catch (err: any) {
            console.warn(`[Orchestration] Failed to download template PPTX: ${err.message}`);
          }
        }
      }

      if (!templateAnalysis) {
        // Use default template analysis
        templateAnalysis = await templateAnalyser.analyseTemplate(Buffer.from(''), 'default');
      }

      // Step 2: Fetch company data
      await this.updateGeneration(generationId, 'fetching_data', 30, 'Fetching company data...');

      let financials = null;
      let filings: any[] = [];
      let news: any[] = [];

      let ticker: string | undefined = request.ticker;

      // Try provided ticker first, then fall back to searching by company name
      if (ticker) {
        try {
          const data = await dataRetrieval.getComprehensiveData(ticker);
          financials = data.financials;
          filings = data.filings;
          news = data.news;
        } catch (err: any) {
          console.warn(`[Orchestration] Ticker "${ticker}" failed: ${err.message}. Trying company name search...`);
          const resolved = await this.resolveTickerFromName(request.company);
          if (resolved) {
            ticker = resolved;
            const data = await dataRetrieval.getComprehensiveData(ticker);
            financials = data.financials;
            filings = data.filings;
            news = data.news;
          }
        }
      } else if (request.company) {
        // No ticker provided, try to find one from company name
        const resolved = await this.resolveTickerFromName(request.company);
        if (resolved) {
          ticker = resolved;
          const data = await dataRetrieval.getComprehensiveData(ticker);
          financials = data.financials;
          filings = data.filings;
          news = data.news;
        }
      }

      // Step 3: Plan content
      await this.updateGeneration(generationId, 'planning_content', 50, 'Planning slide content...');

      // Check for user-customised deck layout
      let customSlideStructure: string | undefined;
      try {
        const { data: customDeckTypes } = await supabaseAdmin
          .from('custom_deck_types')
          .select('*, deck_type_slides(*)')
          .eq('user_id', userId)
          .eq('name', request.pb_type);

        if (customDeckTypes && customDeckTypes.length > 0) {
          const dt = customDeckTypes[0];
          const slides = (dt.deck_type_slides || []).sort((a: any, b: any) => a.slide_index - b.slide_index);
          if (slides.length > 0) {
            customSlideStructure = slides
              .map((s: any, i: number) => `${i + 1}. ${s.title} — ${s.description || ''} (${s.layout_type})`)
              .join('\n');
          }
        }
      } catch (err: any) {
        console.warn(`[Orchestration] Failed to fetch custom deck layout: ${err.message}`);
      }

      const contentPlan = await contentPlanner.generateContentPlan({
        company: request.company,
        ticker: ticker || request.ticker,
        pbType: request.pb_type,
        transactionType: request.transaction_type,
        financials,
        templateAnalysis,
        additionalContext: request.additional_context,
        customSlideStructure,
      });

      // Step 4: Build slides
      await this.updateGeneration(generationId, 'building_slides', 75, 'Building presentation...');

      let buffer: Buffer;
      let slidesData;

      if (templateBuffer) {
        // Template mode: clone template slides and inject content
        console.log('[Orchestration] Using template-based slide builder');
        const result = await templateSlideBuilder.buildFromTemplate(templateBuffer, contentPlan);
        buffer = result.buffer;
        slidesData = result.slidesData;
      } else {
        // Default mode: generate from scratch with PptxGenJS
        const result = await slideBuilder.buildPresentation(contentPlan, templateAnalysis, {
          pbType: request.pb_type,
          company: request.company,
          ticker: ticker || request.ticker,
          colorTheme: request.color_theme,
          designStyle: request.design_style,
        });
        buffer = result.buffer;
        slidesData = result.slidesData;
      }

      // Step 5: Upload PPTX file to Supabase Storage
      const fileName = `${pitchBookId}/${request.company.replace(/\s+/g, '_')}_pitch_book.pptx`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from(env.STORAGE_BUCKET)
        .upload(fileName, buffer, { contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });

      let fileUrl = '';
      if (!uploadError) {
        const { data: urlData } = supabaseAdmin.storage.from(env.STORAGE_BUCKET).getPublicUrl(fileName);
        fileUrl = urlData.publicUrl;
      }

      // Step 6: Generate slide preview images
      await this.updateGeneration(generationId, 'generating_previews', 85, 'Generating slide previews...');

      let slidePreviews: string[] = [];
      try {
        const pngBuffers = await pptxPreview.convertToImages(buffer);
        // Upload each PNG to storage
        const uploadPromises = pngBuffers.map(async (png, i) => {
          const imgName = `${pitchBookId}/previews/slide-${String(i + 1).padStart(3, '0')}.png`;
          await supabaseAdmin.storage
            .from(env.STORAGE_BUCKET)
            .upload(imgName, png, { contentType: 'image/png' });
          const { data: urlData } = supabaseAdmin.storage.from(env.STORAGE_BUCKET).getPublicUrl(imgName);
          return urlData.publicUrl;
        });
        slidePreviews = await Promise.all(uploadPromises);
        console.log(`[Orchestration] Uploaded ${slidePreviews.length} slide preview images`);
      } catch (previewErr: any) {
        console.warn(`[Orchestration] Preview generation failed (non-fatal): ${previewErr.message}`);
      }

      // Step 7: Update pitch book with results
      await supabaseAdmin
        .from('pitch_books')
        .update({
          status: 'completed',
          slides_data: slidesData,
          file_url: fileUrl,
          slide_previews: slidePreviews,
          updated_at: new Date().toISOString(),
        })
        .eq('id', pitchBookId);

      await this.updateGeneration(generationId, 'completed', 100, 'Generation complete');
      await supabaseAdmin
        .from('generations')
        .update({ completed_at: new Date().toISOString() })
        .eq('id', generationId);

    } catch (error: any) {
      console.error(`[Orchestration] Pipeline error:`, error);

      await supabaseAdmin
        .from('pitch_books')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('id', pitchBookId);

      await supabaseAdmin
        .from('generations')
        .update({
          status: 'failed',
          error: error.message,
          completed_at: new Date().toISOString(),
        })
        .eq('id', generationId);
    }
  }

  private async resolveTickerFromName(companyName: string): Promise<string | null> {
    try {
      const result = await yahooFinance.search(companyName, { quotesCount: 5, newsCount: 0 });
      const equity = result?.quotes?.find((q: any) => q.quoteType === 'EQUITY');
      if (equity?.symbol) {
        console.log(`[Orchestration] Resolved company "${companyName}" to ticker: ${equity.symbol}`);
        return equity.symbol;
      }
      console.warn(`[Orchestration] Could not resolve ticker for "${companyName}"`);
      return null;
    } catch (err: any) {
      console.warn(`[Orchestration] Ticker search failed for "${companyName}":`, err.message);
      return null;
    }
  }

  private async updateGeneration(id: string, status: string, progress: number, step: string) {
    await supabaseAdmin
      .from('generations')
      .update({ status, progress, current_step: step })
      .eq('id', id);
  }
}

export const orchestration = new OrchestrationService();
