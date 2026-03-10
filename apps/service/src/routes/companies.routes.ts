import { Router } from 'express';
import { dataRetrieval } from '../services/data-retrieval.service';
import env from '../config/env';

const router = Router();

/**
 * @swagger
 * /api/companies/search:
 *   get:
 *     summary: Search for company tickers via SEC EDGAR
 *     tags: [Companies]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema: { type: string }
 */
router.get('/search', async (req, res, next) => {
  try {
    const query = (req.query.q as string || '').trim();
    if (!query || query.length < 1) {
      return res.json({ success: true, data: [] });
    }

    // Use SEC EDGAR full-text search (free, no rate limits on search)
    const edgarRes = await fetch(
      `https://efts.sec.gov/LATEST/search-index?q=${encodeURIComponent(query)}&dateRange=custom&startdt=2020-01-01&enddt=2026-12-31&forms=10-K,10-Q&from=0&size=10`,
      {
        headers: { 'User-Agent': env.SEC_EDGAR_USER_AGENT },
        signal: AbortSignal.timeout(8000),
      },
    ).catch(() => null);

    // Also try the EDGAR company tickers JSON for exact matches
    const tickerRes = await fetch(
      `https://efts.sec.gov/LATEST/search-index?q=%22${encodeURIComponent(query)}%22&forms=10-K&from=0&size=5`,
      {
        headers: { 'User-Agent': env.SEC_EDGAR_USER_AGENT },
        signal: AbortSignal.timeout(8000),
      },
    ).catch(() => null);

    // Use the company_search endpoint which is more reliable
    const searchRes = await fetch(
      `https://efts.sec.gov/LATEST/search-index?q=${encodeURIComponent(query)}&forms=10-K,10-Q,8-K&from=0&size=15`,
      {
        headers: { 'User-Agent': env.SEC_EDGAR_USER_AGENT },
        signal: AbortSignal.timeout(8000),
      },
    ).catch(() => null);

    // Fallback: Use the SEC EDGAR company search API
    const companySearchRes = await fetch(
      `https://efts.sec.gov/LATEST/search-index?q=${encodeURIComponent(query)}&dateRange=custom&forms=10-K&from=0&size=10`,
      {
        headers: { 'User-Agent': env.SEC_EDGAR_USER_AGENT },
        signal: AbortSignal.timeout(8000),
      },
    ).catch(() => null);

    // Try the simple company tickers endpoint
    const companyTickers = await fetch(
      'https://www.sec.gov/files/company_tickers.json',
      {
        headers: { 'User-Agent': env.SEC_EDGAR_USER_AGENT },
        signal: AbortSignal.timeout(8000),
      },
    ).then(r => r.ok ? r.json() : null).catch(() => null);

    const results: { symbol: string; name: string; exchange: string; type: string }[] = [];
    const seen = new Set<string>();

    if (companyTickers) {
      const lowerQ = query.toLowerCase();
      const entries = Object.values(companyTickers) as any[];
      for (const entry of entries) {
        if (results.length >= 10) break;
        const ticker = entry.ticker || '';
        const title = entry.title || '';
        if (
          ticker.toLowerCase().startsWith(lowerQ) ||
          title.toLowerCase().includes(lowerQ)
        ) {
          if (!seen.has(ticker)) {
            seen.add(ticker);
            results.push({
              symbol: ticker,
              name: title,
              exchange: 'US',
              type: 'EQUITY',
            });
          }
        }
      }
    }

    res.json({ success: true, data: results });
  } catch (err: any) {
    console.error('[CompanySearch] Error:', err.message);
    next(err);
  }
});

/**
 * @swagger
 * /api/companies/{ticker}/logo:
 *   get:
 *     summary: Get company logo URL
 *     tags: [Companies]
 */
router.get('/:ticker/logo', async (req, res) => {
  const ticker = req.params.ticker.toUpperCase();
  // Use multiple free logo sources
  const logoUrl = `https://logo.clearbit.com/${ticker.toLowerCase()}.com`;
  res.json({ success: true, data: { logoUrl, ticker } });
});

/**
 * @swagger
 * /api/companies/{ticker}/financials:
 *   get:
 *     summary: Fetch company financials from Yahoo Finance
 *     tags: [Companies]
 *     parameters:
 *       - in: path
 *         name: ticker
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Company financial data }
 */
router.get('/:ticker/financials', async (req, res, next) => {
  try {
    const data = await dataRetrieval.getCompanyFinancials(req.params.ticker);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/companies/{ticker}/filings:
 *   get:
 *     summary: Fetch SEC EDGAR filings
 *     tags: [Companies]
 *     parameters:
 *       - in: path
 *         name: ticker
 *         required: true
 *         schema: { type: string }
 */
router.get('/:ticker/filings', async (req, res, next) => {
  try {
    const data = await dataRetrieval.getSECFilings(req.params.ticker);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/companies/{ticker}/news:
 *   get:
 *     summary: Search for company news
 *     tags: [Companies]
 *     parameters:
 *       - in: path
 *         name: ticker
 *         required: true
 *         schema: { type: string }
 */
router.get('/:ticker/news', async (req, res, next) => {
  try {
    const data = await dataRetrieval.getCompanyNews(req.params.ticker, req.params.ticker);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/companies/{ticker}/comprehensive:
 *   get:
 *     summary: Get all company data (financials + filings + news)
 *     tags: [Companies]
 */
router.get('/:ticker/comprehensive', async (req, res, next) => {
  try {
    const data = await dataRetrieval.getComprehensiveData(req.params.ticker);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

export default router;
