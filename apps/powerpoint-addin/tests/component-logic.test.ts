import { describe, it, expect, beforeEach } from 'vitest';

describe('CreatePitchbook Logic', () => {
  // These constants are from components/CreatePitchbook.tsx
  const PB_TYPES = [
    { value: 'company_overview', label: 'Company Overview' },
    { value: 'investor_pitch', label: 'Investor Pitch' },
    { value: 'market_update', label: 'Market Update' },
    { value: 'transaction_summary', label: 'Transaction Summary' },
    { value: 'industry_overview', label: 'Industry Overview' },
    { value: 'fundraising_deck', label: 'Fundraising Deck' },
    { value: 'due_diligence', label: 'Due Diligence' },
  ];

  const TX_TYPES = [
    { value: 'ma', label: 'M&A' },
    { value: 'capital_raising', label: 'Capital Raising' },
    { value: 'ipo', label: 'IPO' },
    { value: 'restructuring', label: 'Restructuring' },
    { value: 'debt_financing', label: 'Debt Financing' },
  ];

  const COLOR_THEMES = [
    { value: 'navy_gold', label: 'Navy & Gold', colors: ['#1B2A4A', '#C5961A'] },
    { value: 'teal_coral', label: 'Teal & Coral', colors: ['#0A5E5E', '#E55934'] },
    { value: 'slate_emerald', label: 'Slate & Emerald', colors: ['#1E2D3D', '#27AE60'] },
    { value: 'midnight_blue', label: 'Midnight Blue', colors: ['#0D1B2A', '#1B4965'] },
    { value: 'charcoal_red', label: 'Charcoal & Red', colors: ['#2D2D2D', '#C0392B'] },
    { value: 'forest_cream', label: 'Forest & Cream', colors: ['#1A3C2A', '#F5E6CC'] },
    { value: 'purple_gold', label: 'Purple & Gold', colors: ['#2D1B4E', '#D4A843'] },
    { value: 'monochrome', label: 'Monochrome', colors: ['#1A1A1A', '#666666'] },
  ];

  it('should have 7 pitch book types', () => {
    expect(PB_TYPES).toHaveLength(7);
  });

  it('should have unique pitch book type values', () => {
    const values = PB_TYPES.map(t => t.value);
    expect(new Set(values).size).toBe(values.length);
  });

  it('should have 5 transaction types', () => {
    expect(TX_TYPES).toHaveLength(5);
  });

  it('should have 8 color themes', () => {
    expect(COLOR_THEMES).toHaveLength(8);
  });

  it('should have valid hex colors in all themes', () => {
    const hexRegex = /^#[0-9A-Fa-f]{6}$/;
    for (const theme of COLOR_THEMES) {
      for (const color of theme.colors) {
        expect(color).toMatch(hexRegex);
      }
    }
  });

  describe('Form Validation Logic', () => {
    it('should require company name', () => {
      const company = '';
      const pbType = 'company_overview';
      const isValid = !!company && !!pbType;
      expect(isValid).toBe(false);
    });

    it('should require pitch book type', () => {
      const company = 'Apple Inc.';
      const pbType = '';
      const isValid = !!company && !!pbType;
      expect(isValid).toBe(false);
    });

    it('should pass validation with both fields', () => {
      const company = 'Apple Inc.';
      const pbType = 'company_overview';
      const isValid = !!company && !!pbType;
      expect(isValid).toBe(true);
    });
  });
});

describe('GeneratingView Logic', () => {
  const STEPS = [
    { key: 'analyzing_template', label: 'Analysing template' },
    { key: 'fetching_data', label: 'Fetching financial data' },
    { key: 'planning_content', label: 'Planning slide content' },
    { key: 'building_slides', label: 'Building presentation' },
    { key: 'generating_previews', label: 'Generating previews' },
    { key: 'completed', label: 'Complete' },
  ];

  it('should have 6 generation steps', () => {
    expect(STEPS).toHaveLength(6);
  });

  it('should end with completed step', () => {
    expect(STEPS[STEPS.length - 1].key).toBe('completed');
  });

  it('should correctly identify completed steps', () => {
    const currentStatus = 'planning_content';
    const currentIdx = STEPS.findIndex(s => s.key === currentStatus);

    // Steps before current should be "done"
    expect(currentIdx).toBe(2);
    expect(STEPS.slice(0, currentIdx).every(s => s.key !== currentStatus)).toBe(true);
  });

  it('should handle unknown status gracefully', () => {
    const unknownStatus = 'unknown_step';
    const idx = STEPS.findIndex(s => s.key === unknownStatus);
    expect(idx).toBe(-1);
  });
});

describe('DeckLayoutDetail Logic', () => {
  interface SlideEntry {
    slide_index: number;
    title: string;
    layout_type: string;
    description: string;
  }

  const LAYOUT_TYPES = [
    'Title Slide', 'Section Header', 'Content Slide', 'Two Column',
    'Financial Table', 'Chart Slide', 'Key Metrics', 'Executive Summary', 'Comparison Table',
  ];

  it('should have 9 layout types', () => {
    expect(LAYOUT_TYPES).toHaveLength(9);
  });

  describe('Slide Operations', () => {
    let slides: SlideEntry[];

    beforeEach(() => {
      slides = [
        { slide_index: 0, title: 'Title', layout_type: 'Title Slide', description: 'Cover' },
        { slide_index: 1, title: 'Summary', layout_type: 'Executive Summary', description: 'Key points' },
        { slide_index: 2, title: 'Content', layout_type: 'Content Slide', description: 'Details' },
      ];
    });

    it('should add a slide with correct index', () => {
      const newSlide: SlideEntry = {
        slide_index: slides.length,
        title: 'New Slide',
        layout_type: 'Content Slide',
        description: '',
      };
      slides.push(newSlide);
      expect(slides).toHaveLength(4);
      expect(slides[3].slide_index).toBe(3);
    });

    it('should remove a slide and reindex', () => {
      // Remove index 1 and reindex
      slides = slides.filter((_, i) => i !== 1).map((s, i) => ({ ...s, slide_index: i }));
      expect(slides).toHaveLength(2);
      expect(slides[0].title).toBe('Title');
      expect(slides[1].title).toBe('Content');
      expect(slides[1].slide_index).toBe(1);
    });

    it('should reorder slides via drag and drop', () => {
      // Simulate moving slide from index 2 to index 0
      const [moved] = slides.splice(2, 1);
      slides.splice(0, 0, moved);
      slides = slides.map((s, i) => ({ ...s, slide_index: i }));

      expect(slides[0].title).toBe('Content');
      expect(slides[1].title).toBe('Title');
      expect(slides[2].title).toBe('Summary');
      expect(slides.every((s, i) => s.slide_index === i)).toBe(true);
    });

    it('should update a slide field', () => {
      const idx = 1;
      slides[idx] = { ...slides[idx], title: 'Updated Summary' };
      expect(slides[1].title).toBe('Updated Summary');
    });

    it('should detect dirty state via JSON comparison', () => {
      const savedSlides = JSON.stringify(slides);
      expect(JSON.stringify(slides) !== savedSlides).toBe(false); // Not dirty

      slides[0] = { ...slides[0], title: 'Modified Title' };
      expect(JSON.stringify(slides) !== savedSlides).toBe(true); // Dirty
    });

    it('should detect clean state after save', () => {
      const savedSlides = JSON.stringify(slides);
      slides[0] = { ...slides[0], title: 'Modified' };
      expect(JSON.stringify(slides) !== savedSlides).toBe(true); // Dirty

      // Simulate save
      const newSaved = JSON.stringify(slides);
      expect(JSON.stringify(slides) !== newSaved).toBe(false); // Clean
    });
  });
});

describe('PitchbookList Status Logic', () => {
  const statusStyles: Record<string, string> = {
    completed: 'bg-green-500',
    generating: 'bg-yellow-500',
    failed: 'bg-red-500',
  };

  it('should return green for completed', () => {
    expect(statusStyles['completed']).toContain('green');
  });

  it('should return yellow for generating', () => {
    expect(statusStyles['generating']).toContain('yellow');
  });

  it('should return red for failed', () => {
    expect(statusStyles['failed']).toContain('red');
  });

  it('should return undefined for unknown status', () => {
    expect(statusStyles['unknown']).toBeUndefined();
  });
});

describe('Dropdown Direction Logic', () => {
  it('should drop up when less than 240px below', () => {
    const spaceBelow = 200;
    const dropUp = spaceBelow < 240;
    expect(dropUp).toBe(true);
  });

  it('should drop down when more than 240px below', () => {
    const spaceBelow = 300;
    const dropUp = spaceBelow < 240;
    expect(dropUp).toBe(false);
  });
});
