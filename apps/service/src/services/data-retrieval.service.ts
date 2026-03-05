import type { CompanyFinancials, FinancialPeriod, SECFiling, CompanyNews } from '@pitchdeck/shared-types';
import env from '../config/env';

/**
 * Data Retrieval Service
 *
 * Agentic data retrieval layer that automatically pulls company financials,
 * market data, and regulatory filings from Yahoo Finance and SEC EDGAR.
 */
export class DataRetrievalService {

  /**
   * Fetch comprehensive company financials from Yahoo Finance.
   * Includes current metrics and historical data.
   */
  async getCompanyFinancials(ticker: string): Promise<CompanyFinancials> {
    try {
      // Dynamic import for yahoo-finance2 (ESM module)
      const yahooFinance = require('yahoo-finance2').default;

      const [quote, financials] = await Promise.all([
        yahooFinance.quote(ticker),
        yahooFinance.fundamentalsTimeSeries(ticker, {
          period1: new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          period2: new Date().toISOString().split('T')[0],
          type: 'annual',
          module: 'all',
        }).catch(() => null),
      ]);

      const historical: FinancialPeriod[] = [];

      // Try to get income statement data
      try {
        const incomeData = await yahooFinance.fundamentalsTimeSeries(ticker, {
          period1: new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          type: 'annual',
          module: 'incomeStatement',
        });

        if (incomeData && Array.isArray(incomeData)) {
          for (const period of incomeData.slice(-5)) {
            historical.push({
              period: period.date || 'N/A',
              revenue: period.totalRevenue || 0,
              net_income: period.netIncome || 0,
              ebitda: period.ebitda || 0,
              total_assets: 0,
              total_debt: 0,
              free_cash_flow: 0,
            });
          }
        }
      } catch {
        // Historical data may not be available for all tickers
      }

      return {
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
    } catch (error: any) {
      console.error(`[DataRetrieval] Failed to fetch financials for ${ticker}:`, error.message);
      throw new Error(`Failed to fetch financial data for ${ticker}: ${error.message}`);
    }
  }

  /**
   * Fetch SEC EDGAR filings for a company.
   * Uses the EDGAR full-text search API (EFTS).
   */
  async getSECFilings(ticker: string, filingTypes: string[] = ['10-K', '10-Q', '8-K']): Promise<SECFiling[]> {
    try {
      const response = await fetch(
        `https://efts.sec.gov/LATEST/search-index?q="${ticker}"&dateRange=custom&startdt=${this.getDateNYearsAgo(2)}&enddt=${this.getToday()}&forms=${filingTypes.join(',')}`,
        {
          headers: {
            'User-Agent': env.SEC_EDGAR_USER_AGENT,
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        // Fallback to company search
        return await this.searchEDGARByCompany(ticker);
      }

      const data = await response.json();
      return (data.hits?.hits || []).slice(0, 20).map((hit: any) => ({
        accession_number: hit._source?.file_num || hit._id || '',
        filing_type: hit._source?.form_type || '',
        filing_date: hit._source?.file_date || '',
        description: hit._source?.display_names?.join(', ') || '',
        url: `https://www.sec.gov/Archives/edgar/data/${hit._source?.entity_id}/${hit._id}`,
      }));
    } catch (error: any) {
      console.error(`[DataRetrieval] SEC EDGAR error for ${ticker}:`, error.message);
      return [];
    }
  }

  /**
   * Search EDGAR company filings endpoint as fallback.
   */
  private async searchEDGARByCompany(ticker: string): Promise<SECFiling[]> {
    try {
      const response = await fetch(
        `https://efts.sec.gov/LATEST/search-index?q="${ticker}"&forms=10-K,10-Q,8-K`,
        {
          headers: {
            'User-Agent': env.SEC_EDGAR_USER_AGENT,
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) return [];

      const data = await response.json();
      return (data.hits?.hits || []).slice(0, 10).map((filing: any) => ({
        accession_number: filing._id || '',
        filing_type: filing._source?.form_type || '',
        filing_date: filing._source?.file_date || '',
        description: filing._source?.display_names?.join(', ') || '',
        url: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&company=${ticker}&type=&dateb=&owner=include&count=40`,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Search for company news using Google Custom Search or fallback.
   */
  async getCompanyNews(companyName: string, ticker: string): Promise<CompanyNews[]> {
    // Use a simple news aggregation approach
    try {
      const query = encodeURIComponent(`${companyName} ${ticker} financial news`);
      const response = await fetch(
        `https://newsapi.org/v2/everything?q=${query}&sortBy=publishedAt&pageSize=10&apiKey=${process.env.NEWS_API_KEY || 'demo'}`,
        { headers: { 'Accept': 'application/json' } }
      );

      if (!response.ok) {
        // Return placeholder news when API key not set
        return this.getFallbackNews(companyName, ticker);
      }

      const data = await response.json();
      return (data.articles || []).map((article: any) => ({
        title: article.title,
        url: article.url,
        source: article.source?.name || 'Unknown',
        published_at: article.publishedAt,
        summary: article.description || '',
      }));
    } catch {
      return this.getFallbackNews(companyName, ticker);
    }
  }

  private getFallbackNews(companyName: string, ticker: string): CompanyNews[] {
    return [
      {
        title: `Latest financial results for ${companyName} (${ticker})`,
        url: `https://finance.yahoo.com/quote/${ticker}/news`,
        source: 'Yahoo Finance',
        published_at: new Date().toISOString(),
        summary: `Visit Yahoo Finance for the latest news and analysis on ${companyName}.`,
      },
    ];
  }

  /**
   * Aggregate all data for a company — financials, filings, and news.
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
