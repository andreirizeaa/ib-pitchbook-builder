import { describe, it, expect } from 'vitest';
import { getDefaultTheme } from '../../src/services/default-themes';

describe('Default Themes', () => {
  describe('getDefaultTheme', () => {
    it('should return navy_gold theme for company_overview', () => {
      const theme = getDefaultTheme('company_overview');

      expect(theme.palette.primary).toBe('#1B2A4A');
      expect(theme.decorSecondary).toBe('#C5961A');
    });

    it('should return teal_coral theme for market_update', () => {
      const theme = getDefaultTheme('market_update');

      expect(theme.palette.primary).toBe('#0A5E5E');
      expect(theme.decorSecondary).toBe('#E55934');
    });

    it('should return slate_emerald theme for transaction_summary', () => {
      const theme = getDefaultTheme('transaction_summary');

      expect(theme.palette.primary).toBe('#1E2D3D');
      expect(theme.decorSecondary).toBe('#27AE60');
    });

    it('should prioritize color_theme over pb_type', () => {
      const theme = getDefaultTheme('company_overview', 'teal_coral');

      // Should be teal_coral, not navy_gold
      expect(theme.palette.primary).toBe('#0A5E5E');
    });

    it('should fall back to navy_gold for unknown pb_type', () => {
      const theme = getDefaultTheme('unknown_type');

      expect(theme.palette.primary).toBe('#1B2A4A');
    });

    it('should fall back to navy_gold when no arguments', () => {
      const theme = getDefaultTheme();

      expect(theme.palette.primary).toBe('#1B2A4A');
    });

    it('should ignore invalid color_theme and use pb_type', () => {
      const theme = getDefaultTheme('market_update', 'nonexistent_theme');

      expect(theme.palette.primary).toBe('#0A5E5E');
    });

    it('should have valid palette colours (hex format)', () => {
      const pbTypes = [
        'company_overview', 'market_update', 'transaction_summary',
        'investor_pitch', 'industry_overview', 'fundraising_deck', 'due_diligence',
      ];

      for (const pbType of pbTypes) {
        const theme = getDefaultTheme(pbType);
        const hexRegex = /^#[0-9A-Fa-f]{6}$/;

        expect(theme.palette.primary).toMatch(hexRegex);
        expect(theme.palette.secondary).toMatch(hexRegex);
        expect(theme.palette.accent).toMatch(hexRegex);
        expect(theme.palette.background).toMatch(hexRegex);
        expect(theme.palette.text).toMatch(hexRegex);
        expect(theme.palette.colors.length).toBeGreaterThanOrEqual(6);
      }
    });

    it('should have all required theme properties', () => {
      const theme = getDefaultTheme('company_overview');

      expect(theme.decorPrimary).toBeDefined();
      expect(theme.decorSecondary).toBeDefined();
      expect(theme.panelTint).toBeDefined();
      expect(theme.cardBg).toBeDefined();
      expect(theme.cardAccent).toBeDefined();
      expect(theme.sectionBgLayers).toBeDefined();
      expect(theme.sectionBgLayers.length).toBeGreaterThanOrEqual(2);
    });

    it('should support all documented color themes', () => {
      const colorThemes = [
        'navy_gold', 'teal_coral', 'slate_emerald', 'midnight_blue',
        'charcoal_red', 'forest_cream', 'purple_gold', 'monochrome',
      ];

      for (const ct of colorThemes) {
        const theme = getDefaultTheme(undefined, ct);
        expect(theme.palette.primary).toBeDefined();
        expect(theme.palette.colors.length).toBeGreaterThanOrEqual(6);
      }
    });
  });
});
