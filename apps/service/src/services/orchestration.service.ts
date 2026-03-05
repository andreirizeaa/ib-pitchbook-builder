import type { PitchBook, Generation, CreatePitchBookRequest } from '@pitchdeck/shared-types';
import { v4 as uuid } from 'uuid';
import { supabaseAdmin } from '../lib/supabase';
import { templateAnalyser } from './template-analyser.service';
import { dataRetrieval } from './data-retrieval.service';
import { contentPlanner } from './content-planner.service';
import { slideBuilder } from './slide-builder.service';
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
      if (request.template_id) {
        const { data: template } = await supabaseAdmin
          .from('templates')
          .select('*')
          .eq('id', request.template_id)
          .single();

        if (template?.analysis_data) {
          templateAnalysis = template.analysis_data;
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

      if (request.ticker) {
        const data = await dataRetrieval.getComprehensiveData(request.ticker);
        financials = data.financials;
        filings = data.filings;
        news = data.news;
      }

      // Step 3: Plan content
      await this.updateGeneration(generationId, 'planning_content', 50, 'Planning slide content...');

      const contentPlan = await contentPlanner.generateContentPlan({
        company: request.company,
        ticker: request.ticker,
        pbType: request.pb_type,
        transactionType: request.transaction_type,
        financials,
        templateAnalysis,
        additionalContext: request.additional_context,
      });

      // Step 4: Build slides
      await this.updateGeneration(generationId, 'building_slides', 75, 'Building presentation...');

      const { buffer, slidesData } = await slideBuilder.buildPresentation(contentPlan, templateAnalysis);

      // Step 5: Upload file to Supabase Storage
      const fileName = `${pitchBookId}/${request.company.replace(/\s+/g, '_')}_pitch_book.pptx`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from(env.STORAGE_BUCKET)
        .upload(fileName, buffer, { contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });

      let fileUrl = '';
      if (!uploadError) {
        const { data: urlData } = supabaseAdmin.storage.from(env.STORAGE_BUCKET).getPublicUrl(fileName);
        fileUrl = urlData.publicUrl;
      }

      // Step 6: Update pitch book with results
      await supabaseAdmin
        .from('pitch_books')
        .update({
          status: 'completed',
          slides_data: slidesData,
          file_url: fileUrl,
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

  private async updateGeneration(id: string, status: string, progress: number, step: string) {
    await supabaseAdmin
      .from('generations')
      .update({ status, progress, current_step: step })
      .eq('id', id);
  }
}

export const orchestration = new OrchestrationService();
