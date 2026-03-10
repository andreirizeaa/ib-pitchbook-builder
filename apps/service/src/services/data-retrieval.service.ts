import type { CompanyFinancials, FinancialPeriod, SECFiling, CompanyNews } from '@pitchdeck/shared-types';
import yahooFinance from 'yahoo-finance2';
import env from '../config/env';

/**
 * Data Retrieval Service
 *
 * Pulls company financials from Yahoo Finance and filings from SEC EDGAR.
 */
export class DataRetrievalService {

  /**
   * Fetch comprehensive company financials from Yahoo Finance.
   */
  async getCompanyFinancials(ticker: string): Promise<CompanyFinancials> {
    try {
      // Suppress yahoo-finance2 validation warnings
      try { yahooFinance.suppressNotices(['yahooSurvey', 'rippieLive']); } catch {};

      console.log(`[DataRetrieval] Fetching quote for ${ticker}...`);
      const quote = await yahooFinance.quote(ticker);

      const historical: FinancialPeriod[] = [];

      // Try multiple approaches for historical data
      try {
        console.log(`[DataRetrieval] Fetching income statements for ${ticker}...`);
        const result = await yahooFinance.quoteSummary(ticker, {
          modules: ['incomeStatementHistory', 'incomeStatementHistoryQuarterly'],
        });

        const annualData = result?.incomeStatementHistory?.incomeStatementHistory;
        if (annualData && Array.isArray(annualData)) {
          for (const stmt of annualData.slice(-5)) {
            historical.push({
              period: stmt.endDate || 'N/A',
              revenue: stmt.totalRevenue || 0,
              net_income: stmt.netIncome || 0,
              ebitda: stmt.ebitda || (stmt.totalRevenue ? stmt.totalRevenue * 0.2 : 0),
              total_assets: 0,
              total_debt: 0,
              free_cash_flow: 0,
            });
          }
        }
      } catch (histErr: any) {
        console.warn(`[DataRetrieval] Income statement history failed for ${ticker}:`, histErr.message);
      }

      // If no historical data from quoteSummary, try fundamentalsTimeSeries
      if (historical.length === 0) {
        try {
          console.log(`[DataRetrieval] Trying fundamentalsTimeSeries for ${ticker}...`);
          const tsData = await yahooFinance.fundamentalsTimeSeries(ticker, {
            period1: new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            type: 'annual',
            module: 'all',
          });

          if (tsData && Array.isArray(tsData)) {
            for (const period of tsData.slice(-5)) {
              if (period.annualTotalRevenue || period.annualNetIncome) {
                historical.push({
                  period: period.date || 'N/A',
                  revenue: period.annualTotalRevenue || 0,
                  net_income: period.annualNetIncome || 0,
                  ebitda: period.annualEbitda || 0,
                  total_assets: period.annualTotalAssets || 0,
                  total_debt: period.annualTotalDebt || 0,
                  free_cash_flow: period.annualFreeCashFlow || 0,
                });
              }
            }
          }
        } catch (tsErr: any) {
          console.warn(`[DataRetrieval] fundamentalsTimeSeries failed for ${ticker}:`, tsErr.message);
        }
      }

      console.log(`[DataRetrieval] Got ${historical.length} historical periods for ${ticker}`);

      const result: CompanyFinancials = {
        ticker,
        name: quote.shortName || quote.longName || ticker,
        sector: quote.sector || 'Unknown',
        industry: quote.industry || 'Unknown',
        market_cap: quote.marketCap || 0,
        revenue: quote.totalRevenue || 0,
        net_income: quote.netIncomeToCommon || 0,
        ebitda: quote.ebitda || 0,
        pe_ratio: quote.trailingPE || 0,
        ev_ebitda: quote.enterpriseToEbitda || 0,
        revenue_growth: quote.revenueGrowth || 0,
        profit_margin: quote.profitMargins || 0,
        historical,
      };

      console.log(`[DataRetrieval] Financials for ${ticker}: Revenue $${(result.revenue / 1e9).toFixed(1)}B, Market Cap $${(result.market_cap / 1e9).toFixed(1)}B`);
      return result;
    } catch (error: any) {
      console.error(`[DataRetrieval] Failed to fetch financials for ${ticker}:`, error.message);
      throw new Error(`Failed to fetch financial data for ${ticker}: ${error.message}`);
    }
  }

  /**
   * Fetch SEC EDGAR filings.
   */
  async getSECFilings(ticker: string): Promise<SECFiling[]> {
    try {
      const response = await fetch(
        `https://efts.sec.gov/LATEST/search-index?q="${ticker}"&dateRange=custom&startdt=${this.getDateNYearsAgo(2)}&enddt=${this.getToday()}&forms=10-K,10-Q,8-K`,
        {
          headers: {
            'User-Agent': env.SEC_EDGAR_USER_AGENT,
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(10000),
        }
      );

      if (!response.ok) return [];

      const data = await response.json();
      return (data.hits?.hits || []).slice(0, 20).map((hit: any) => ({
        accession_number: hit._source?.file_num || hit._id || '',
        filing_type: hit._source?.form_type || '',
        filing_date: hit._source?.file_date || '',
        description: hit._source?.display_names?.join(', ') || '',
        url: `https://www.sec.gov/Archives/edgar/data/${hit._source?.entity_id}/${hit._id}`,
      }));
    } catch (error: any) {
      console.warn(`[DataRetrieval] SEC EDGAR error for ${ticker}:`, error.message);
      return [];
    }
  }

  /**
   * Get company news (basic approach).
   */
  async getCompanyNews(companyName: string, ticker: string): Promise<CompanyNews[]> {
    return [{
      title: `Latest financial results for ${companyName} (${ticker})`,
      url: `https://finance.yahoo.com/quote/${ticker}/news`,
      source: 'Yahoo Finance',
      published_at: new Date().toISOString(),
      summary: `Visit Yahoo Finance for the latest news and analysis on ${companyName}.`,
    }];
  }

  /**
   * Aggregate all data for a company.
   */
  async getComprehensiveData(ticker: string) {
    const [financials, filings, news] = await Promise.allSettled([
      this.getCompanyFinancials(ticker),
      this.getSECFilings(ticker),
      this.getCompanyNews(ticker, ticker),
    ]);

    return {
      financials: financials.status === 'fulfilled' ? financials.value : null,
      filings: filings.status === 'fulfilled' ? filings.value : [],
      news: news.status === 'fulfilled' ? news.value : [],
      errors: [financials, filings, news]
        .filter(r => r.status === 'rejected')
        .map(r => (r as PromiseRejectedResult).reason?.message || 'Unknown error'),
    };
  }

  private getDateNYearsAgo(n: number): string {
    const d = new Date();
    d.setFullYear(d.getFullYear() - n);
    return d.toISOString().split('T')[0];
  }

  private getToday(): string {
    return new Date().toISOString().split('T')[0];
  }
}

export const dataRetrieval = new DataRetrievalService();
