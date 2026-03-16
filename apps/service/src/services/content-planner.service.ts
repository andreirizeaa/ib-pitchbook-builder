import type {
  ContentPlan, ContentSlide, ContentBlock,
  PitchBookType, TransactionType, CompanyFinancials,
  TemplateAnalysis,
} from '@pitchdeck/shared-types';
import OpenAI from 'openai';
import env from '../config/env';
import { SYSTEM_PROMPT, buildUserPrompt, getStructureGuidelines } from '../prompts/pitchbook-content.prompt';
import { parseContentPlan } from '../prompts/pitchbook-content.schema';

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

/**
 * Content Planner Service
 *
 * Uses OpenAI GPT-4o with structured output (Zod schema) to generate
 * company-specific slide content for investment banking pitch books.
 */
export class ContentPlannerService {

  async generateContentPlan(params: {
    company: string;
    ticker?: string;
    pbType: PitchBookType;
    transactionType: TransactionType;
    financials: CompanyFinancials | null;
    templateAnalysis: TemplateAnalysis;
    additionalContext?: string;
    customSlideStructure?: string;
  }): Promise<ContentPlan> {
    const { company, ticker, pbType, transactionType, financials, templateAnalysis, additionalContext, customSlideStructure } = params;

    const availableLayouts = templateAnalysis.slide_layouts.map(l => l.name);
    const userPrompt = this.buildUserPrompt(company, ticker, pbType, transactionType, financials, additionalContext, availableLayouts, customSlideStructure);

    try {
      console.log(`[ContentPlanner] Generating content plan for ${company} (${ticker}) via OpenAI...`);

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        temperature: 0.4,
        max_tokens: 8192,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
      });

      const text = response.choices[0]?.message?.content;
      if (!text) {
        console.error('[ContentPlanner] No response from OpenAI');
        return this.generateFallbackPlan(company, ticker, pbType, transactionType, financials);
      }

      let raw = JSON.parse(text);

      // Handle case where OpenAI wraps the response in an extra object
      // e.g. { "pitch_book": { "title": ..., "slides": [...] } }
      if (!raw.slides && !raw.title) {
        const keys = Object.keys(raw);
        if (keys.length === 1 && typeof raw[keys[0]] === 'object' && raw[keys[0]]?.slides) {
          console.log(`[ContentPlanner] Unwrapping nested response from key: "${keys[0]}"`);
          raw = raw[keys[0]];
        }
      }

      console.log(`[ContentPlanner] Raw response keys: ${Object.keys(raw).join(', ')}, slides count: ${raw.slides?.length || 0}`);

      const parsed = parseContentPlan(raw);

      console.log(`[ContentPlanner] Successfully generated ${parsed.slides.length} slides (schema validated)`);
      return this.enrichPlan(parsed, templateAnalysis);
    } catch (error: any) {
      console.error('[ContentPlanner] OpenAI error:', error.message || JSON.stringify(error));
      return this.generateFallbackPlan(company, ticker, pbType, transactionType, financials);
    }
  }

  // ── Prompt Building ──

  private buildUserPrompt(
    company: string,
    ticker: string | undefined,
    pbType: PitchBookType,
    transactionType: TransactionType,
    financials: CompanyFinancials | null,
    additionalContext?: string,
    availableLayouts?: string[],
    customSlideStructure?: string,
  ): string {
    const pbTypeLabel = {
      company_overview: 'Company Overview',
      market_update: 'Market Update',
      transaction_summary: 'Transaction Summary',
      investor_pitch: 'Investor Pitch',
      industry_overview: 'Industry Overview',
      fundraising_deck: 'Fundraising Deck',
      due_diligence: 'Due Diligence',
    }[pbType];

    const txTypeLabel = {
      ma: 'Mergers & Acquisitions',
      capital_raising: 'Capital Raising',
      restructuring: 'Restructuring',
      ipo: 'Initial Public Offering',
      debt_financing: 'Debt Financing',
    }[transactionType];

    const financialData = financials
      ? this.formatFinancialData(financials)
      : `\n=== NO FINANCIAL DATA AVAILABLE ===\nUse your knowledge of ${company} to provide approximate but realistic figures. Clearly mark any estimates.\n`;

    const layoutList = (availableLayouts && availableLayouts.length > 0)
      ? availableLayouts.join(' | ')
      : 'Title Slide | Section Header | Content Slide | Two Column | Financial Table | Chart Slide | Key Metrics | Executive Summary | Comparison Table';

    const structureGuidelines = customSlideStructure || getStructureGuidelines(pbType, company);

    return buildUserPrompt({
      company,
      ticker,
      pbTypeLabel,
      txTypeLabel,
      financialData,
      additionalContext,
      layoutList,
      structureGuidelines,
    });
  }

  private formatFinancialData(financials: CompanyFinancials): string {
    let data = `
=== COMPANY FINANCIAL DATA (USE THESE EXACT NUMBERS) ===
Company: ${financials.name}
Ticker: ${financials.ticker}
Sector: ${financials.sector}
Industry: ${financials.industry}

Current Metrics:
- Market Cap: $${this.fmtB(financials.market_cap)}
- Revenue (TTM): $${this.fmtB(financials.revenue)}
- Net Income (TTM): $${this.fmtM(financials.net_income)}
- EBITDA (TTM): $${this.fmtM(financials.ebitda)}
- P/E Ratio: ${financials.pe_ratio?.toFixed(1) || 'N/A'}x
- EV/EBITDA: ${financials.ev_ebitda?.toFixed(1) || 'N/A'}x
- Revenue Growth (YoY): ${this.fmtPct(financials.revenue_growth)}
- Profit Margin: ${this.fmtPct(financials.profit_margin)}
`;

    if (financials.historical && financials.historical.length > 0) {
      data += `\nHistorical Financials (USE FOR CHARTS AND TABLES):\n`;
      for (const p of financials.historical) {
        const year = p.period ? new Date(p.period).getFullYear() : 'N/A';
        data += `  FY${year}: Revenue $${this.fmtB(p.revenue)} | EBITDA $${this.fmtM(p.ebitda)} | Net Income $${this.fmtM(p.net_income)}`;
        if (p.free_cash_flow) data += ` | FCF $${this.fmtM(p.free_cash_flow)}`;
        data += `\n`;
      }
    }

    return data;
  }

  // ── Post-Processing ──

  private enrichPlan(parsed: any, templateAnalysis: TemplateAnalysis): ContentPlan {
    const validLayouts = templateAnalysis.slide_layouts.map(l => l.name);

    return {
      title: parsed.title,
      narrative_arc: parsed.narrative_arc,
      slides: parsed.slides.map((slide: any, i: number) => ({
        index: i,
        title: slide.title,
        layout: this.matchLayout(slide.layout, validLayouts),
        talking_points: slide.talking_points || [],
        data_requirements: slide.data_requirements || [],
        content_blocks: (slide.content_blocks || []).map((block: any) => ({
          type: block.type,
          content: block.content,
        })),
      })),
    };
  }

  private matchLayout(requested: string, available: string[]): string {
    if (!requested) return available.includes('Content Slide') ? 'Content Slide' : available[0] || 'Content Slide';
    if (available.includes(requested)) return requested;

    const norm = (s: string) => s.toLowerCase().replace(/[\s_-]+/g, '');
    const normRequested = norm(requested);
    const exactNorm = available.find(l => norm(l) === normRequested);
    if (exactNorm) return exactNorm;

    const keywordMap: Record<string, string[]> = {
      'Title Slide': ['title slide', 'cover', 'title'],
      'Section Header': ['section', 'header', 'divider'],
      'Content Slide': ['content', 'body', 'text', 'blank'],
      'Two Column': ['two column', 'two col', 'split', 'comparison'],
      'Financial Table': ['financial table', 'table', 'data'],
      'Chart Slide': ['chart', 'graph', 'visualization'],
      'Key Metrics': ['metrics', 'kpi', 'dashboard', 'numbers'],
      'Executive Summary': ['executive', 'summary', 'overview'],
      'Comparison Table': ['comparison', 'comp table', 'versus'],
    };

    const lower = requested.toLowerCase();
    for (const [layoutName, keywords] of Object.entries(keywordMap)) {
      if (available.includes(layoutName) && keywords.some(k => lower.includes(k))) {
        return layoutName;
      }
    }

    for (const layoutName of available) {
      const layoutWords = layoutName.toLowerCase().split(/[\s_-]+/);
      const requestedWords = lower.split(/[\s_-]+/);
      if (layoutWords.some(w => requestedWords.includes(w))) return layoutName;
    }

    return available.includes('Content Slide') ? 'Content Slide' : available[0] || 'Content Slide';
  }

  // ── Fallback Plan ──

  private generateFallbackPlan(
    company: string,
    ticker: string | undefined,
    pbType: PitchBookType,
    transactionType: TransactionType,
    financials: CompanyFinancials | null,
  ): ContentPlan {
    const slides: ContentSlide[] = [];
    let idx = 0;

    slides.push({
      index: idx++,
      title: `${company} — ${this.formatPbType(pbType)}`,
      layout: 'Title Slide',
      talking_points: ['Confidential'],
      data_requirements: [],
      content_blocks: [
        { type: 'heading', content: `${company} ${ticker ? `(${ticker})` : ''}` },
        { type: 'paragraph', content: `${this.formatPbType(pbType)} | ${this.formatTxType(transactionType)}` },
        { type: 'paragraph', content: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) },
      ],
    });

    slides.push({
      index: idx++,
      title: 'Executive Summary',
      layout: 'Executive Summary',
      talking_points: ['Key investment highlights'],
      data_requirements: [],
      content_blocks: [
        { type: 'heading', content: 'Executive Summary' },
        {
          type: 'bullet_list',
          content: financials ? [
            `${financials.name} operates in the ${financials.industry} space within the ${financials.sector} sector`,
            `Market capitalisation of $${this.fmtB(financials.market_cap)} with a P/E ratio of ${financials.pe_ratio?.toFixed(1) || 'N/A'}x`,
            `TTM revenue of $${this.fmtB(financials.revenue)} with ${this.fmtPct(financials.revenue_growth)} year-over-year growth`,
            `EBITDA of $${this.fmtM(financials.ebitda)} representing a ${this.fmtPct(financials.ebitda && financials.revenue ? financials.ebitda / financials.revenue : 0)} margin`,
            `Profit margin of ${this.fmtPct(financials.profit_margin)}`,
          ] : [
            `${company} — financial data unavailable. Please provide a valid ticker symbol for detailed analysis.`,
          ],
        },
      ],
    });

    if (financials) {
      slides.push({
        index: idx++,
        title: 'Key Financial Metrics',
        layout: 'Key Metrics',
        talking_points: ['Financial snapshot'],
        data_requirements: [],
        content_blocks: [
          { type: 'metric', content: { label: 'Market Cap', value: `$${this.fmtB(financials.market_cap)}` } },
          { type: 'metric', content: { label: 'Revenue (TTM)', value: `$${this.fmtB(financials.revenue)}` } },
          { type: 'metric', content: { label: 'EBITDA', value: `$${this.fmtM(financials.ebitda)}` } },
          { type: 'metric', content: { label: 'P/E Ratio', value: `${financials.pe_ratio?.toFixed(1) || 'N/A'}x` } },
        ],
      });
    }

    if (financials?.historical && financials.historical.length >= 2) {
      const labels = financials.historical.map(p => `FY${new Date(p.period).getFullYear()}`);
      const revenues = financials.historical.map(p => +(p.revenue / 1e9).toFixed(2));
      const ebitdas = financials.historical.map(p => +(p.ebitda / 1e6).toFixed(0));

      slides.push({
        index: idx++,
        title: 'Revenue & EBITDA Trend',
        layout: 'Chart Slide',
        talking_points: ['Historical financial performance'],
        data_requirements: [],
        content_blocks: [{
          type: 'chart',
          content: {
            chartType: 'bar',
            title: `${company} Revenue & EBITDA Trend`,
            data: [
              { name: 'Revenue ($B)', labels, values: revenues },
              { name: 'EBITDA ($M)', labels, values: ebitdas },
            ],
          },
        }],
      });
    }

    slides.push({
      index: idx++,
      title: 'Financial Summary',
      layout: 'Financial Table',
      talking_points: ['Detailed financials'],
      data_requirements: [],
      content_blocks: [{
        type: 'table',
        content: financials ? this.buildFinancialTable(financials) : {
          headers: ['Metric', 'Value'],
          rows: [['No financial data available', '—']],
        },
      }],
    });

    slides.push({
      index: idx++,
      title: 'Company Overview',
      layout: 'Two Column',
      talking_points: ['Business description'],
      data_requirements: [],
      content_blocks: [
        { type: 'heading', content: 'Company Overview' },
        {
          type: 'bullet_list',
          content: financials ? [
            `Sector: ${financials.sector}`,
            `Industry: ${financials.industry}`,
            `Full Name: ${financials.name}`,
            `Ticker: ${financials.ticker}`,
            `Revenue Growth: ${this.fmtPct(financials.revenue_growth)}`,
            `Profit Margin: ${this.fmtPct(financials.profit_margin)}`,
          ] : [`${company} — provide ticker for detailed company data`],
        },
      ],
    });

    return {
      title: `${company} — ${this.formatPbType(pbType)}`,
      narrative_arc: `Overview of ${company} covering financial performance, market position, and strategic considerations.`,
      slides,
    };
  }

  private buildFinancialTable(fin: CompanyFinancials): { headers: string[]; rows: string[][] } {
    if (fin.historical && fin.historical.length > 0) {
      const periods = fin.historical.slice(-4);
      const headers = ['Metric', ...periods.map(p => `FY${new Date(p.period).getFullYear()}`), 'Current'];
      return {
        headers,
        rows: [
          ['Revenue', ...periods.map(p => `$${this.fmtB(p.revenue)}`), `$${this.fmtB(fin.revenue)}`],
          ['EBITDA', ...periods.map(p => `$${this.fmtM(p.ebitda)}`), `$${this.fmtM(fin.ebitda)}`],
          ['Net Income', ...periods.map(p => `$${this.fmtM(p.net_income)}`), `$${this.fmtM(fin.net_income)}`],
        ],
      };
    }

    return {
      headers: ['Metric', 'Value'],
      rows: [
        ['Market Cap', `$${this.fmtB(fin.market_cap)}`],
        ['Revenue (TTM)', `$${this.fmtB(fin.revenue)}`],
        ['EBITDA', `$${this.fmtM(fin.ebitda)}`],
        ['Net Income', `$${this.fmtM(fin.net_income)}`],
        ['P/E Ratio', `${fin.pe_ratio?.toFixed(1) || 'N/A'}x`],
        ['EV/EBITDA', `${fin.ev_ebitda?.toFixed(1) || 'N/A'}x`],
      ],
    };
  }

  // ── Formatting Helpers ──

  private fmtB(n: number): string {
    if (!n || isNaN(n)) return 'N/A';
    if (Math.abs(n) / 1e9 >= 1) return `${(n / 1e9).toFixed(1)}B`;
    return `${(n / 1e6).toFixed(0)}M`;
  }

  private fmtM(n: number): string {
    if (!n || isNaN(n)) return 'N/A';
    if (Math.abs(n) / 1e6 >= 1000) return `${(n / 1e9).toFixed(1)}B`;
    return `${(n / 1e6).toFixed(0)}M`;
  }

  private fmtPct(n: number): string {
    if (n === null || n === undefined || isNaN(n)) return 'N/A';
    return `${(n * 100).toFixed(1)}%`;
  }

  private formatPbType(pbType: PitchBookType): string {
    return {
      company_overview: 'Company Overview', market_update: 'Market Update', transaction_summary: 'Transaction Summary',
      investor_pitch: 'Investor Pitch', industry_overview: 'Industry Overview', fundraising_deck: 'Fundraising Deck', due_diligence: 'Due Diligence',
    }[pbType];
  }

  private formatTxType(txType: TransactionType): string {
    return { ma: 'M&A', capital_raising: 'Capital Raising', restructuring: 'Restructuring', ipo: 'IPO', debt_financing: 'Debt Financing' }[txType];
  }
}

export const contentPlanner = new ContentPlannerService();
