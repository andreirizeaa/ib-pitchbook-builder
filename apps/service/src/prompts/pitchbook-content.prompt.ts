/**
 * Pitch Book Content Generation Prompts
 *
 * Centralised prompt definitions for the LLM-powered content planner.
 * Separated from service logic for easy editing and version control.
 */

export const SYSTEM_PROMPT = `You are a senior Managing Director at Goldman Sachs creating investment banking pitch books.

You produce structured JSON slide plans that are company-specific, data-driven, and written in professional IB language.

CRITICAL RULES:
1. ALL financial data in slides MUST use the EXACT numbers provided in the user message. NEVER fabricate numbers.
2. Every chart MUST have a "data" array with real numbers from the provided financials.
3. Tables MUST contain real financial figures, never placeholders like "X" or "TBD".
4. Content must be deeply specific to the company — mention their actual products, markets, competitors, recent events, strategy.
5. Write like a real IB analyst: precise, data-driven, no fluff. Use specific dollar amounts, percentages, multiples.
6. Each bullet point should contain a concrete fact or insight, not generic statements.
7. NEVER write generic phrases like "leading company in its sector" or "strong market position" or "well positioned for growth". Be SPECIFIC about what makes the company unique.
8. Include at least 2 slides with charts showing historical trends if historical data is provided.
9. Include at least 1 detailed financial table with multi-year data.
10. Generate exactly 10-12 slides.
11. For chart data, values must be raw numbers (not formatted strings). Labels should be year strings like "FY2022".
12. For metric blocks, value should be a formatted string like "$2.8T" or "32.5x".
13. For table blocks, headers and rows must be arrays of strings. Every row must have the same length as headers.

You MUST return JSON in EXACTLY this format — no wrapper objects, no renaming keys:

{
  "title": "Pitch book title",
  "narrative_arc": "Brief description of the narrative flow",
  "slides": [
    {
      "index": 0,
      "title": "Slide Title",
      "layout": "Title Slide",
      "talking_points": ["point 1", "point 2"],
      "data_requirements": ["requirement 1"],
      "content_blocks": [
        { "type": "heading", "content": "Heading text" },
        { "type": "paragraph", "content": "Paragraph text" },
        { "type": "bullet_list", "content": ["bullet 1", "bullet 2"] },
        { "type": "table", "content": { "headers": ["Col1", "Col2"], "rows": [["val1", "val2"]] } },
        { "type": "chart", "content": { "chartType": "bar", "title": "Chart Title", "data": [{ "name": "Series", "labels": ["FY2022"], "values": [100] }] } },
        { "type": "metric", "content": { "label": "Metric Name", "value": "$1.5B" } }
      ]
    }
  ]
}

The root of the JSON must have exactly three keys: "title", "narrative_arc", and "slides". Do NOT nest them inside another object.`;


export function buildUserPrompt(params: {
  company: string;
  ticker?: string;
  pbTypeLabel: string;
  txTypeLabel: string;
  financialData: string;
  additionalContext?: string;
  layoutList: string;
  structureGuidelines: string;
}): string {
  const { company, ticker, pbTypeLabel, txTypeLabel, financialData, additionalContext, layoutList, structureGuidelines } = params;

  return `Create a ${pbTypeLabel} pitch book for **${company}** (ticker: ${ticker || 'N/A'}).
Transaction context: ${txTypeLabel}

${financialData}

${additionalContext ? `=== ADDITIONAL INSTRUCTIONS ===\n${additionalContext}\n` : ''}

=== AVAILABLE SLIDE LAYOUTS ===
${layoutList}

=== REQUIRED SLIDE STRUCTURE FOR ${pbTypeLabel.toUpperCase()} ===
${structureGuidelines}

Remember: Be extremely specific to ${company}. Reference their actual products, services, recent acquisitions, competitive position, and strategy. Every number must come from the data above. Write like a Goldman Sachs MD presenting to a client.`;
}


export function getStructureGuidelines(pbType: string, company: string): string {
  const guidelines: Record<string, string> = {
    company_overview: `
1. Title Slide — "${company}" + subtitle with type and date
2. Executive Summary — 4-5 specific investment highlights with real numbers (use Executive Summary or Key Metrics layout)
3. Company Overview — What ${company} does, key products/services, markets served, employees, HQ (Two Column)
4. Key Financial Metrics — 4 metric cards with market cap, revenue, EBITDA, key multiple (Key Metrics)
5. Revenue & Profitability Trends — Multi-year revenue and EBITDA bar/line chart with real historical data (Chart Slide)
6. Detailed Financial Summary — Multi-year income statement table with revenue, EBITDA, net income, margins (Financial Table)
7. Market Position & Competitive Landscape — Where ${company} sits vs competitors, market share insights (Content Slide)
8. Valuation Analysis — Current trading multiples vs sector averages, peer comparison (Comparison Table or Chart Slide)
9. Growth Strategy & Opportunities — Specific growth drivers, M&A strategy, expansion plans (Two Column)
10. Risk Factors — Specific risks: regulatory, competitive, macro, execution (Content Slide)
11. Appendix — Additional data tables, methodology notes (Financial Table)`,

    market_update: `
1. Title Slide — Market Update title + date
2. Executive Summary — Key market themes and takeaways (Executive Summary)
3. Macro Economic Overview — GDP, rates, inflation context (Content Slide)
4. Sector Performance — Returns by sector, chart with real data (Chart Slide)
5. M&A Activity — Recent deals in the space, transaction volume trends (Financial Table)
6. Capital Markets Activity — IPO, debt issuance trends (Chart Slide)
7. Valuation Trends — Multiple expansion/contraction trends (Chart Slide)
8. ${company} Spotlight — Company-specific metrics and positioning (Key Metrics)
9. Financial Summary — Key data table for ${company} (Financial Table)
10. Outlook & Implications — Forward-looking view and recommendations (Content Slide)`,

    transaction_summary: `
1. Title Slide — Transaction name + parties involved
2. Executive Summary — Deal overview: structure, size, rationale (Executive Summary)
3. Transaction Overview — Key terms, consideration, timeline (Content Slide)
4. ${company} Profile — Business overview, key strengths (Two Column)
5. Key Transaction Metrics — Deal value, multiples, premium (Key Metrics)
6. Historical Financial Performance — Revenue/EBITDA trend chart (Chart Slide)
7. Financial Detail — Multi-year financials table (Financial Table)
8. Strategic Rationale — Why this transaction makes sense, synergies (Content Slide)
9. Transaction Comparables — Comparable deals table with multiples (Comparison Table)
10. Next Steps & Timeline — Key milestones and dates (Content Slide)`,

    investor_pitch: `
1. Title Slide — "${company}" Investment Opportunity + date
2. Executive Summary — Compelling investment thesis with 4-5 key reasons to invest (Executive Summary)
3. Company At a Glance — What ${company} does, market opportunity size, key differentiators (Two Column)
4. Key Investment Metrics — Market cap, revenue, growth rate, key multiple (Key Metrics)
5. Market Opportunity — Total addressable market, growth drivers, secular trends (Content Slide)
6. Financial Performance — Revenue and profitability trends with historical data (Chart Slide)
7. Competitive Positioning — ${company} vs peers, moat and advantages (Comparison Table)
8. Growth Strategy — Expansion plans, product roadmap, M&A pipeline (Two Column)
9. Financial Projections — Forward estimates, revenue bridge, margin expansion (Financial Table)
10. Valuation — Current multiples vs peers, implied upside, target price framework (Chart Slide)
11. Risk Factors & Mitigants — Key risks with specific mitigating factors (Content Slide)`,

    industry_overview: `
1. Title Slide — Industry/Sector Overview + date
2. Executive Summary — Key industry themes and outlook (Executive Summary)
3. Industry Landscape — Market size, structure, value chain overview (Content Slide)
4. Market Size & Growth — TAM/SAM data, historical and projected growth (Chart Slide)
5. Key Players — Major companies, market share breakdown (Comparison Table)
6. Competitive Dynamics — Porter's forces, barriers to entry, consolidation trends (Two Column)
7. Financial Benchmarking — Peer comparison of revenue, margins, multiples (Financial Table)
8. Valuation Landscape — Sector multiples, premium/discount analysis (Chart Slide)
9. M&A & Deal Activity — Recent transactions, deal flow trends (Financial Table)
10. Trends & Disruptions — Technology shifts, regulatory changes, emerging themes (Content Slide)
11. Outlook & Implications — Forward view, investment themes (Content Slide)`,

    fundraising_deck: `
1. Title Slide — "${company}" Capital Raise + date
2. Executive Summary — Fundraising highlights: amount, use of proceeds, thesis (Executive Summary)
3. Company Overview — Business model, products, customers, traction (Two Column)
4. Key Metrics — Revenue, growth rate, unit economics, key KPIs (Key Metrics)
5. Market Opportunity — TAM, growth trajectory, why now (Content Slide)
6. Financial Performance — Historical revenue and margin trends (Chart Slide)
7. Use of Proceeds — How capital will be deployed, expected impact (Two Column)
8. Financial Projections — 3-5 year revenue, EBITDA, cash flow projections (Financial Table)
9. Comparable Transactions — Recent fundraises/deals in the space (Comparison Table)
10. Valuation Framework — Implied valuation, comparable multiples (Chart Slide)
11. Investment Highlights — Summary of why to invest now (Content Slide)`,

    due_diligence: `
1. Title Slide — "${company}" Due Diligence Report + date
2. Executive Summary — Key findings and risk assessment (Executive Summary)
3. Company Overview — Business description, history, corporate structure (Content Slide)
4. Key Financial Metrics — Revenue, EBITDA, margins, leverage ratios (Key Metrics)
5. Revenue Analysis — Revenue breakdown by segment, geography, customer concentration (Chart Slide)
6. Detailed Financial Review — Multi-year P&L with margin analysis (Financial Table)
7. Balance Sheet Analysis — Assets, liabilities, working capital, debt schedule (Financial Table)
8. Cash Flow Analysis — Operating, investing, financing cash flows (Chart Slide)
9. Quality of Earnings — Adjustments, normalised EBITDA, non-recurring items (Two Column)
10. Risk Assessment — Operational, financial, legal, regulatory risks (Content Slide)
11. Peer Comparison — Benchmarking vs comparable companies (Comparison Table)
12. Appendix — Supporting schedules and data tables (Financial Table)`,
  };
  return guidelines[pbType] || guidelines.company_overview;
}
