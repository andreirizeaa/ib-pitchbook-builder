import { Router } from 'express';
import { dataRetrieval } from '../services/data-retrieval.service';

const router = Router();

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
