import type {
  ContentPlan, ContentSlide, ContentBlock,
  PitchBookType, TransactionType, CompanyFinancials,
  TemplateAnalysis,
} from '@pitchdeck/shared-types';
import env from '../config/env';

/**
 * Content Planner Service
 *
 * LLM-powered content planning module that produces structured slide
 * specifications adapted to different pitch book types while keeping
 * the overall narrative coherent.
 *
 * Uses Google Gemini for content generation.
 */
export class ContentPlannerService {

  /**
   * Generate a complete content plan for a pitch book.
   * The plan specifies every slide's content, data needs, and layout.
   */
  async generateContentPlan(params: {
    company: string;
    ticker?: string;
    pbType: PitchBookType;
    transactionType: TransactionType;
    financials: CompanyFinancials | null;
    templateAnalysis: TemplateAnalysis;
    additionalContext?: string;
  }): Promise<ContentPlan> {
    const { company, ticker, pbType, transactionType, financials, templateAnalysis, additionalContext } = params;

    const prompt = this.buildPrompt(company, ticker, pbType, transactionType, financials, additionalContext);

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.3,
              topP: 0.8,
              maxOutputTokens: 8192,
              responseMimeType: 'application/json',
            },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[ContentPlanner] Gemini API error:', errorText);
        // Fall back to template-based plan
        return this.generateFallbackPlan(company, ticker, pbType, transactionType, financials);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        return this.generateFallbackPlan(company, ticker, pbType, transactionType, financials);
      }

      const parsed = JSON.parse(text);
      return this.validateAndEnrichPlan(parsed, templateAnalysis);
    } catch (error: any) {
      console.error('[ContentPlanner] Error generating content plan:', error.message);
      return this.generateFallbackPlan(company, ticker, pbType, transactionType, financials);
    }
  }

  /**
   * Build the LLM prompt for content planning.
   */
  private buildPrompt(
    company: string,
    ticker: string | undefined,
    pbType: PitchBookType,
    transactionType: TransactionType,
    financials: CompanyFinancials | null,
    additionalContext?: string,
  ): string {
    const pbTypeLabel = {
      company_overview: 'Company Overview',
      market_update: 'Market Update',
      transaction_summary: 'Transaction Summary',
    }[pbType];

    const txTypeLabel = {
      ma: 'Mergers & Acquisitions',
      capital_raising: 'Capital Raising',
      restructuring: 'Restructuring',
      ipo: 'Initial Public Offering',
      debt_financing: 'Debt Financing',
    }[transactionType];

    let financialContext = '';
    if (financials) {
      financialContext = `
## Company Financial Data
- Name: ${financials.name}
- Sector: ${financials.sector} | Industry: ${financials.industry}
- Market Cap: $${(financials.market_cap / 1e9).toFixed(2)}B
- Revenue: $${(financials.revenue / 1e9).toFixed(2)}B
- Net Income: $${(financials.net_income / 1e6).toFixed(1)}M
- EBITDA: $${(financials.ebitda / 1e6).toFixed(1)}M
- P/E Ratio: ${financials.pe_ratio?.toFixed(1) || 'N/A'}
- EV/EBITDA: ${financials.ev_ebitda?.toFixed(1) || 'N/A'}
- Revenue Growth: ${((financials.revenue_growth || 0) * 100).toFixed(1)}%
- Profit Margin: ${((financials.profit_margin || 0) * 100).toFixed(1)}%
`;
    }

    return `You are an investment banking analyst creating a pitch book content plan.

## Task
Create a detailed content plan for a **${pbTypeLabel}** pitch book about **${company}** (${ticker || 'N/A'}).
Transaction context: **${txTypeLabel}**

${financialContext}

${additionalContext ? `## Additional Context\n${additionalContext}\n` : ''}

## Requirements
Generate a JSON object with this exact structure:
{
  "title": "Main pitch book title",
  "narrative_arc": "Brief description of the story this pitch book tells",
  "slides": [
    {
      "index": 0,
      "title": "Slide title",
      "layout": "Title Slide|Section Header|Content Slide|Two Column|Financial Table|Chart Slide|Key Metrics",
      "talking_points": ["Key point 1", "Key point 2"],
      "data_requirements": ["What data this slide needs"],
      "content_blocks": [
        {
          "type": "heading|paragraph|bullet_list|table|chart|metric",
          "content": "The actual content or data structure"
        }
      ]
    }
  ]
}

## Pitch Book Structure Guidelines
For a ${pbTypeLabel}:
${this.getStructureGuidelines(pbType)}

Generate 8-12 slides. Use professional investment banking language. Include specific financial data where available.
Be precise with numbers — use the financial data provided.`;
  }

  private getStructureGuidelines(pbType: PitchBookType): string {
    const guidelines: Record<PitchBookType, string> = {
      company_overview: `
1. Title Slide — Company name, date, confidential notice
2. Executive Summary — Key highlights and investment thesis
3. Company Overview — Business description, history, key products/services
4. Market Position — Industry overview, competitive landscape, market share
5. Financial Summary — Key financial metrics, revenue breakdown
6. Historical Financial Performance — Revenue, EBITDA, margins over time
7. Valuation Overview — Trading multiples, peer comparison
8. Key Strengths & Opportunities — Growth drivers, competitive advantages
9. Risk Factors — Key risks and mitigants
10. Appendix — Detailed financials, methodology notes`,

      market_update: `
1. Title Slide — Market Update title, date, bank branding
2. Executive Summary — Key market themes and takeaways
3. Macro Overview — GDP, interest rates, inflation trends
4. Sector Performance — Industry-specific performance metrics
5. M&A Activity — Recent transactions, deal volume trends
6. Capital Markets — IPO activity, debt issuance trends
7. Valuation Trends — Multiple expansion/contraction analysis
8. Company Spotlight — Featured company analysis
9. Outlook & Implications — Forward-looking market view
10. Appendix — Data sources, methodology`,

      transaction_summary: `
1. Title Slide — Transaction name, date, parties involved
2. Executive Summary — Transaction overview and rationale
3. Transaction Overview — Structure, terms, timeline
4. Buyer/Investor Profile — Background on acquiring party
5. Target Company Overview — Business and financial summary
6. Strategic Rationale — Why this transaction makes sense
7. Financial Analysis — Valuation, synergies, accretion/dilution
8. Transaction Comparables — Similar recent transactions
9. Key Considerations — Risks, regulatory, integration
10. Next Steps & Timeline — Process and milestones`,
    };
    return guidelines[pbType];
  }

  /**
   * Validate the LLM output and ensure it matches template layouts.
   */
  private validateAndEnrichPlan(parsed: any, templateAnalysis: TemplateAnalysis): ContentPlan {
    const validLayouts = templateAnalysis.slide_layouts.map(l => l.name);

    return {
      title: parsed.title || 'Untitled Pitch Book',
      narrative_arc: parsed.narrative_arc || '',
      slides: (parsed.slides || []).map((slide: any, i: number) => ({
        index: i,
        title: slide.title || `Slide ${i + 1}`,
        layout: validLayouts.includes(slide.layout) ? slide.layout : 'Content Slide',
        talking_points: slide.talking_points || [],
        data_requirements: slide.data_requirements || [],
        content_blocks: (slide.content_blocks || []).map((block: any) => ({
          type: block.type || 'paragraph',
          content: block.content || '',
        })),
      })),
    };
  }

  /**
   * Fallback plan when LLM is unavailable.
   * Generates a structured plan from templates.
   */
  private generateFallbackPlan(
    company: string,
    ticker: string | undefined,
    pbType: PitchBookType,
    transactionType: TransactionType,
    financials: CompanyFinancials | null,
  ): ContentPlan {
    const slides: ContentSlide[] = [
      {
        index: 0,
        title: `${company} — ${this.formatPbType(pbType)}`,
        layout: 'Title Slide',
        talking_points: ['Confidential'],
        data_requirements: [],
        content_blocks: [
          { type: 'heading', content: `${company} ${ticker ? `(${ticker})` : ''}` },
          { type: 'paragraph', content: `${this.formatPbType(pbType)} | ${this.formatTxType(transactionType)}` },
          { type: 'paragraph', content: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) },
        ],
      },
      {
        index: 1,
        title: 'Executive Summary',
        layout: 'Content Slide',
        talking_points: ['Key investment highlights'],
        data_requirements: ['Company overview', 'Financial highlights'],
        content_blocks: [
          { type: 'heading', content: 'Executive Summary' },
          {
            type: 'bullet_list',
            content: [
              `${company} is a ${financials?.industry || 'leading'} company in the ${financials?.sector || 'industry'}`,
              financials ? `Market capitalisation of $${(financials.market_cap / 1e9).toFixed(1)}B` : 'Strong market position',
              financials ? `Revenue of $${(financials.revenue / 1e9).toFixed(1)}B with ${((financials.revenue_growth || 0) * 100).toFixed(1)}% growth` : 'Consistent revenue growth',
              financials ? `EBITDA margin of ${((financials.ebitda / (financials.revenue || 1)) * 100).toFixed(1)}%` : 'Healthy profitability',
            ],
          },
        ],
      },
      {
        index: 2,
        title: 'Company Overview',
        layout: 'Two Column',
        talking_points: ['Business description', 'Key products/services'],
        data_requirements: ['Company description', 'Product breakdown'],
        content_blocks: [
          { type: 'heading', content: 'Company Overview' },
          { type: 'paragraph', content: `${company} operates in the ${financials?.industry || 'technology'} sector, providing products and services to a global customer base.` },
        ],
      },
      {
        index: 3,
        title: 'Key Financial Metrics',
        layout: 'Key Metrics',
        talking_points: ['Financial snapshot'],
        data_requirements: ['Revenue', 'EBITDA', 'Market Cap', 'P/E'],
        content_blocks: [
          { type: 'metric', content: { label: 'Market Cap', value: financials ? `$${(financials.market_cap / 1e9).toFixed(1)}B` : 'N/A' } },
          { type: 'metric', content: { label: 'Revenue', value: financials ? `$${(financials.revenue / 1e9).toFixed(1)}B` : 'N/A' } },
          { type: 'metric', content: { label: 'EBITDA', value: financials ? `$${(financials.ebitda / 1e6).toFixed(0)}M` : 'N/A' } },
        ],
      },
      {
        index: 4,
        title: 'Financial Performance',
        layout: 'Financial Table',
        talking_points: ['Historical financials'],
        data_requirements: ['3-5 year financials'],
        content_blocks: [
          { type: 'heading', content: 'Historical Financial Performance' },
          {
            type: 'table',
            content: {
              headers: ['Metric', 'Current'],
              rows: financials ? [
                ['Revenue', `$${(financials.revenue / 1e9).toFixed(1)}B`],
                ['EBITDA', `$${(financials.ebitda / 1e6).toFixed(0)}M`],
                ['Net Income', `$${(financials.net_income / 1e6).toFixed(0)}M`],
                ['P/E Ratio', `${financials.pe_ratio?.toFixed(1) || 'N/A'}x`],
                ['EV/EBITDA', `${financials.ev_ebitda?.toFixed(1) || 'N/A'}x`],
              ] : [['No data available', '']],
            },
          },
        ],
      },
      {
        index: 5,
        title: 'Market Position',
        layout: 'Content Slide',
        talking_points: ['Industry dynamics', 'Competitive landscape'],
        data_requirements: ['Market data', 'Peer analysis'],
        content_blocks: [
          { type: 'heading', content: 'Market Position & Competitive Landscape' },
          {
            type: 'bullet_list',
            content: [
              `Operating in the ${financials?.sector || 'industry'} sector`,
              `${financials?.industry || 'Diversified'} subsector`,
              'Strong competitive positioning with established market presence',
              'Key competitive advantages include scale, technology, and brand recognition',
            ],
          },
        ],
      },
      {
        index: 6,
        title: 'Key Strengths & Opportunities',
        layout: 'Two Column',
        talking_points: ['Growth drivers', 'Strategic opportunities'],
        data_requirements: [],
        content_blocks: [
          { type: 'heading', content: 'Strengths & Opportunities' },
          {
            type: 'bullet_list',
            content: [
              'Established market leadership',
              'Strong financial performance and cash generation',
              'Significant growth opportunities in adjacent markets',
              'Attractive valuation relative to peers',
            ],
          },
        ],
      },
      {
        index: 7,
        title: 'Risk Factors',
        layout: 'Content Slide',
        talking_points: ['Key risks and mitigants'],
        data_requirements: [],
        content_blocks: [
          { type: 'heading', content: 'Key Risk Factors' },
          {
            type: 'bullet_list',
            content: [
              'Market and economic cycle sensitivity',
              'Competitive pressure from existing and new entrants',
              'Regulatory and compliance requirements',
              'Operational execution risks',
            ],
          },
        ],
      },
    ];

    return {
      title: `${company} — ${this.formatPbType(pbType)}`,
      narrative_arc: `This pitch book presents a comprehensive ${this.formatPbType(pbType).toLowerCase()} of ${company}, covering financial performance, market position, and strategic considerations.`,
      slides,
    };
  }

  private formatPbType(pbType: PitchBookType): string {
    return { company_overview: 'Company Overview', market_update: 'Market Update', transaction_summary: 'Transaction Summary' }[pbType];
  }

  private formatTxType(txType: TransactionType): string {
    return { ma: 'M&A', capital_raising: 'Capital Raising', restructuring: 'Restructuring', ipo: 'IPO', debt_financing: 'Debt Financing' }[txType];
  }
}

export const contentPlanner = new ContentPlannerService();
