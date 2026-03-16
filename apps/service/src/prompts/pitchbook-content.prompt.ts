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

CONTENT DENSITY — THIS IS CRITICAL:
- Every Content Slide MUST have at least 5-7 bullet points OR 2+ substantial paragraphs (3-4 sentences each).
- Every Executive Summary slide MUST have a paragraph overview (2-3 sentences) PLUS a bullet_list with at least 5 specific highlights.
- Every Two Column slide MUST have at least 6-8 bullet points covering both aspects thoroughly.
- Every bullet point must be a FULL SENTENCE with specific data, not a short phrase. BAD: "Strong revenue growth". GOOD: "Revenue grew 61% YoY to $130.5B in FY2024, driven by Data Center segment expansion to $115.2B (+142% YoY) as hyperscaler and enterprise AI adoption accelerated."
- Paragraphs should be 3-5 sentences each, packed with specific company data, strategic analysis, and market context.
- Financial Tables should have at least 4-5 years of data with 5+ row items (Revenue, COGS, Gross Profit, EBITDA, Net Income, margins, etc.).
- Key Metrics slides should have exactly 4 metric cards with precise formatted values.
- Chart Slides should include at least 3 data points (years) per series.
- The Title Slide MUST include a heading with the company name, a paragraph subtitle describing the pitch book purpose, and a second paragraph with the date.
- Section Headers are the ONLY slide type that can be sparse — they just need a title.

SLIDE CONTENT MUST FILL THE SLIDE. A slide with 2 short bullets is UNACCEPTABLE. Think of each slide as a full page in a printed document — it should contain substantial, detailed analysis.

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
        { "type": "paragraph", "content": "Paragraph text — should be 3-5 sentences with specific data" },
        { "type": "bullet_list", "content": ["Full sentence bullet 1 with data", "Full sentence bullet 2 with data", "...at least 5-7 bullets"] },
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
Transaction context: ${txTypeLabel || 'General'}

${financialData}

${additionalContext ? `=== ADDITIONAL USER INSTRUCTIONS (MUST FOLLOW) ===\nThe user has provided the following specific instructions. You MUST incorporate these into the pitch book content, slide structure, and narrative. Treat these as requirements:\n${additionalContext}\n` : ''}

=== AVAILABLE SLIDE LAYOUTS ===
${layoutList}

=== REQUIRED SLIDE STRUCTURE FOR ${pbTypeLabel.toUpperCase()} ===
${structureGuidelines}

=== CONTENT QUALITY CHECKLIST ===
Before returning, verify EVERY slide meets these minimums:
- Title Slide: heading + paragraph subtitle + paragraph date
- Executive Summary: paragraph overview (3+ sentences) + bullet_list (5+ items, each a full sentence with data)
- Content Slide: bullet_list with 5-7 full-sentence bullets OR 2+ paragraphs (3-5 sentences each)
- Two Column: bullet_list with 6-8 items covering both column topics
- Key Metrics: exactly 4 metric blocks with formatted values and descriptive labels
- Financial Table: table with 5+ headers and 4+ data rows with real numbers
- Chart Slide: chart with 3+ data points and descriptive series names
- Comparison Table: table with 5+ rows comparing entities across 4+ columns

Each bullet/paragraph must reference specific ${company} data, products, market figures, or strategic details. NO generic corporate language.

Remember: Be extremely specific to ${company}. Reference their actual products, services, recent acquisitions, competitive position, and strategy. Every number must come from the data above. Write like a Goldman Sachs MD presenting to a client. FILL EVERY SLIDE WITH SUBSTANTIAL CONTENT.`;
}


export function getStructureGuidelines(pbType: string, company: string): string {
  const guidelines: Record<string, string> = {
    company_overview: `
1. Title Slide — "${company}" + subtitle with type and date
2. Executive Summary — Paragraph overview of ${company}'s investment profile + bullet_list of 5 specific investment highlights with real numbers (Executive Summary)
3. Company Overview — What ${company} does, key products/services, revenue segments, markets served, employees, HQ, founding year. Include 6-8 detailed bullet points (Two Column)
4. Key Financial Metrics — 4 metric cards: market cap, revenue (TTM), EBITDA margin, key valuation multiple (Key Metrics)
5. Revenue & Profitability Trends — Multi-year revenue and EBITDA bar/line chart with ALL available historical data points (Chart Slide)
6. Detailed Financial Summary — Multi-year table with: Revenue, Revenue Growth, Gross Profit, EBITDA, EBITDA Margin, Net Income, EPS across all available years (Financial Table)
7. Market Position & Competitive Landscape — 6-8 bullets: market share data, competitive advantages/moat, key competitors with specific comparisons, industry rank (Content Slide)
8. Valuation Analysis — Comparison table: ${company} vs 4-5 named peers across P/E, EV/EBITDA, EV/Revenue, Revenue Growth (Comparison Table)
9. Growth Strategy & Opportunities — 6-8 bullets split across: organic growth drivers, M&A strategy, new market expansion, product pipeline, R&D investments (Two Column)
10. Risk Factors — 6-8 specific risks with context: regulatory, competitive threats (name competitors), macro exposure, execution risks, customer concentration (Content Slide)
11. Appendix — Detailed financial table: quarterly data or balance sheet items (Financial Table)`,

    market_update: `
1. Title Slide — Market Update title + date + sector focus
2. Executive Summary — Paragraph with 3 key market themes + bullet_list of 5 specific takeaways with data (Executive Summary)
3. Macro Economic Overview — 6-8 bullets: GDP growth rates, interest rate environment, inflation data, employment figures, consumer confidence, central bank policy (Content Slide)
4. Sector Performance — Chart with sector returns data across multiple periods (Chart Slide)
5. M&A Activity — Table of 5-8 recent transactions: target, acquirer, deal value, multiple, date (Financial Table)
6. Capital Markets Activity — Chart showing IPO volume, debt issuance trends, equity offerings (Chart Slide)
7. Valuation Trends — Chart of sector multiple trends over time (Chart Slide)
8. ${company} Spotlight — 4 key metrics positioning ${company} within market context (Key Metrics)
9. Financial Summary — Detailed table for ${company}: Revenue, EBITDA, margins, growth rates across years (Financial Table)
10. Outlook & Implications — 6-8 bullets: forward-looking market view, implications for ${company}, recommended actions, catalysts to watch (Content Slide)`,

    transaction_summary: `
1. Title Slide — Transaction name + parties involved + date
2. Executive Summary — Paragraph deal overview (size, structure, rationale) + 5 key transaction highlights with specific terms (Executive Summary)
3. Transaction Overview — 6-8 bullets: structure, consideration (cash/stock mix), premium analysis, conditions, expected timeline, advisor roles (Content Slide)
4. ${company} Profile — 6-8 bullets split: business description, key strengths, competitive positioning, recent performance highlights (Two Column)
5. Key Transaction Metrics — 4 cards: implied enterprise value, EV/EBITDA multiple, premium to undisturbed price, transaction equity value (Key Metrics)
6. Historical Financial Performance — Revenue and EBITDA trend chart with all available years (Chart Slide)
7. Financial Detail — Multi-year table: Revenue, EBITDA, Net Income, FCF, key margins, leverage ratios (Financial Table)
8. Strategic Rationale — 6-8 bullets: revenue synergies, cost synergies, market expansion, competitive positioning, technology/IP, management perspective (Content Slide)
9. Transaction Comparables — Table of 5-8 comparable deals: target, acquirer, EV, EV/EBITDA, EV/Revenue, premium (Comparison Table)
10. Next Steps & Timeline — 6-8 bullets: regulatory approvals needed, shareholder vote timeline, expected closing, integration planning, key milestones (Content Slide)`,

    investor_pitch: `
1. Title Slide — "${company}" Investment Opportunity + date
2. Executive Summary — Paragraph investment thesis (3-4 sentences) + 5 compelling reasons to invest with specific data points (Executive Summary)
3. Company At a Glance — 8 bullets split: what they do, market position, key differentiators, competitive moat, management quality, recent milestones (Two Column)
4. Key Investment Metrics — 4 cards: market cap, revenue growth rate, EBITDA margin, forward P/E or key multiple (Key Metrics)
5. Market Opportunity — 6-8 bullets: TAM size with data, growth rate projections, secular trends driving demand, addressable segments, penetration rates, regulatory tailwinds (Content Slide)
6. Financial Performance — Multi-year revenue and margin chart showing growth trajectory (Chart Slide)
7. Competitive Positioning — Comparison table: ${company} vs 4-5 named competitors across revenue, growth, margins, market share (Comparison Table)
8. Growth Strategy — 6-8 bullets split: organic growth levers (product expansion, geographic), inorganic (M&A pipeline, recent deals), R&D investment, new market entry (Two Column)
9. Financial Projections — Table with 3-5 year projections: Revenue, EBITDA, margins, EPS, FCF (Financial Table)
10. Valuation — Chart showing ${company} trading multiples vs peer average, implied upside scenarios (Chart Slide)
11. Risk Factors & Mitigants — 6-8 bullets: each risk paired with its mitigating factor (Content Slide)`,

    industry_overview: `
1. Title Slide — Industry/Sector Overview + scope + date
2. Executive Summary — Paragraph with industry thesis + 5 key themes with data (Executive Summary)
3. Industry Landscape — 6-8 bullets: market definition, value chain structure, end markets, regulatory framework, key industry body, revenue pools (Content Slide)
4. Market Size & Growth — Chart showing historical and projected market size (TAM), CAGR, growth drivers (Chart Slide)
5. Key Players — Comparison table of 6-8 major companies: revenue, market share, key metric, HQ, focus area (Comparison Table)
6. Competitive Dynamics — 6-8 bullets split: barriers to entry, switching costs, supplier/buyer power, threat of substitutes, consolidation trends, pricing dynamics (Two Column)
7. Financial Benchmarking — Table comparing 5-6 peers: Revenue, Revenue Growth, EBITDA Margin, ROIC, EV/EBITDA, P/E (Financial Table)
8. Valuation Landscape — Chart of sector multiples over time or by company (Chart Slide)
9. M&A & Deal Activity — Table of 6-8 recent industry transactions: target, acquirer, EV, multiple, strategic rationale (Financial Table)
10. Trends & Disruptions — 6-8 bullets: technology shifts, AI/automation impact, ESG considerations, regulatory changes, emerging business models, new entrants (Content Slide)
11. Outlook & Implications — 6-8 bullets: 3-5 year outlook, investment themes, sub-sector picks, positioning for ${company} (Content Slide)`,

    fundraising_deck: `
1. Title Slide — "${company}" Capital Raise + round/instrument type + date
2. Executive Summary — Paragraph overview of the raise + 5 key highlights: amount sought, use of proceeds summary, valuation, traction metrics, growth rate (Executive Summary)
3. Company Overview — 6-8 bullets split: business model, products/services, customer segments, traction/PMF evidence, team highlights, key milestones achieved (Two Column)
4. Key Metrics — 4 cards: ARR/Revenue, growth rate, gross margin or unit economics, key operational KPI (Key Metrics)
5. Market Opportunity — 6-8 bullets: TAM with sources, growth projections, why now (timing), customer pain point, competitive white space, regulatory support (Content Slide)
6. Financial Performance — Chart with revenue trajectory, margin improvement trend, customer growth (Chart Slide)
7. Use of Proceeds — 6-8 bullets split: how capital will be allocated (% breakdowns), expected milestones to achieve, timeline for deployment, expected ROI on spend (Two Column)
8. Financial Projections — Table with 3-5 year forecast: Revenue, Gross Profit, EBITDA, FCF, key operational metrics (Financial Table)
9. Comparable Transactions — Table of 5-8 comparable raises/deals: company, round size, valuation, revenue multiple, growth rate (Comparison Table)
10. Valuation Framework — Chart showing implied valuation vs comparables, scenario analysis (Chart Slide)
11. Investment Highlights — 6-8 bullets: summary of why to invest, key value creation levers, expected return potential, upcoming catalysts (Content Slide)`,

    due_diligence: `
1. Title Slide — "${company}" Due Diligence Report + scope + date
2. Executive Summary — Paragraph summary of key findings + 5 critical items: financial health assessment, key risks identified, quality of earnings verdict, growth sustainability, recommendation (Executive Summary)
3. Company Overview — 6-8 bullets: business description, corporate history, ownership structure, management team, key subsidiaries, geographic footprint (Content Slide)
4. Key Financial Metrics — 4 cards: Revenue, EBITDA, Net Debt/EBITDA leverage, FCF conversion rate (Key Metrics)
5. Revenue Analysis — Chart: revenue by segment or geography over time, concentration analysis (Chart Slide)
6. Detailed Financial Review — Table: 4-5 year P&L: Revenue, COGS, Gross Profit, OpEx, EBITDA, D&A, EBIT, Net Income, all with margins (Financial Table)
7. Balance Sheet Analysis — Table: Assets breakdown, debt schedule, working capital components, equity, key ratios across years (Financial Table)
8. Cash Flow Analysis — Chart: operating, investing, financing cash flows over time, FCF trend (Chart Slide)
9. Quality of Earnings — 6-8 bullets split: EBITDA adjustments identified, normalised earnings, non-recurring items, accounting policy concerns, working capital anomalies, revenue recognition review (Two Column)
10. Risk Assessment — 6-8 bullets: specific operational risks, financial risks (covenant headroom, refinancing), legal/litigation exposure, regulatory risk, customer concentration, key person dependency (Content Slide)
11. Peer Comparison — Table: ${company} vs 4-5 peers: Revenue, Growth, EBITDA Margin, Leverage, ROIC, EV/EBITDA (Comparison Table)
12. Appendix — Detailed table: quarterly trends or supplementary schedules (Financial Table)`,
  };
  return guidelines[pbType] || guidelines.company_overview;
}
