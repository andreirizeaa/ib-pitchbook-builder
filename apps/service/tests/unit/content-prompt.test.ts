import { describe, it, expect } from 'vitest';
import {
  SYSTEM_PROMPT,
  buildUserPrompt,
  getStructureGuidelines,
} from '../../src/prompts/pitchbook-content.prompt';

describe('pitchbook-content.prompt', () => {
  describe('SYSTEM_PROMPT', () => {
    it('should be a non-empty string', () => {
      expect(typeof SYSTEM_PROMPT).toBe('string');
      expect(SYSTEM_PROMPT.length).toBeGreaterThan(0);
    });

    it('should contain "Goldman Sachs"', () => {
      expect(SYSTEM_PROMPT).toContain('Goldman Sachs');
    });

    it('should contain "JSON"', () => {
      expect(SYSTEM_PROMPT).toContain('JSON');
    });
  });

  describe('buildUserPrompt', () => {
    const baseParams = {
      company: 'Acme Corp',
      ticker: 'ACME',
      pbTypeLabel: 'Company Overview',
      txTypeLabel: 'General',
      financialData: 'Revenue: $1B',
      layoutList: 'Title Slide, Content Slide',
      structureGuidelines: 'Some guidelines',
    };

    it('should include company name in output', () => {
      const result = buildUserPrompt(baseParams);
      expect(result).toContain('Acme Corp');
    });

    it('should include ticker in output', () => {
      const result = buildUserPrompt(baseParams);
      expect(result).toContain('ACME');
    });

    it('should include pbTypeLabel in output', () => {
      const result = buildUserPrompt(baseParams);
      expect(result).toContain('Company Overview');
    });

    it('should include additionalContext when provided', () => {
      const result = buildUserPrompt({
        ...baseParams,
        additionalContext: 'Focus on AI strategy',
      });
      expect(result).toContain('Focus on AI strategy');
    });

    it('should handle missing ticker by showing N/A', () => {
      const result = buildUserPrompt({
        ...baseParams,
        ticker: undefined,
      });
      expect(result).toContain('N/A');
    });
  });

  describe('getStructureGuidelines', () => {
    const pbTypes = [
      'company_overview',
      'market_update',
      'transaction_summary',
      'investor_pitch',
      'industry_overview',
      'fundraising_deck',
      'due_diligence',
    ];

    it.each(pbTypes)('should return guidelines for %s', (pbType) => {
      const result = getStructureGuidelines(pbType, 'TestCo');
      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return different guidelines for each pb_type', () => {
      const results = pbTypes.map((t) => getStructureGuidelines(t, 'TestCo'));
      const unique = new Set(results);
      expect(unique.size).toBe(pbTypes.length);
    });

    it('should fall back to company_overview for unknown type', () => {
      const fallback = getStructureGuidelines('nonexistent_type', 'TestCo');
      const companyOverview = getStructureGuidelines('company_overview', 'TestCo');
      expect(fallback).toBe(companyOverview);
    });
  });
});
