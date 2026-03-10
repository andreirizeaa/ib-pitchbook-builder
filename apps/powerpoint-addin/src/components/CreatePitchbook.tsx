import { useState, useRef } from 'react';
import { Loader2, Search, Sparkles } from 'lucide-react';
import { apiClient } from '../lib/api';
import { Dropdown } from './Dropdown';

const PB_TYPES = [
  { value: 'company_overview', label: 'Company Overview', desc: 'Business overview, financials, market position' },
  { value: 'investor_pitch', label: 'Investor Pitch', desc: 'Investment thesis, opportunity, returns potential' },
  { value: 'market_update', label: 'Market Update', desc: 'Sector trends, M&A activity, outlook' },
  { value: 'transaction_summary', label: 'Transaction Summary', desc: 'Deal structure, rationale, analysis' },
  { value: 'industry_overview', label: 'Industry Overview', desc: 'Sector landscape, key players, market dynamics' },
  { value: 'fundraising_deck', label: 'Fundraising Deck', desc: 'Capital raise story, use of proceeds, projections' },
  { value: 'due_diligence', label: 'Due Diligence', desc: 'Deep-dive analysis, risks, financial audit' },
];

const TX_TYPES = [
  { value: 'ma', label: 'M&A' },
  { value: 'capital_raising', label: 'Capital Raising' },
  { value: 'ipo', label: 'IPO' },
  { value: 'restructuring', label: 'Restructuring' },
  { value: 'debt_financing', label: 'Debt Financing' },
];

const COLOR_THEMES = [
  { value: 'navy_gold', label: 'Navy & Gold', colors: ['#1e3a5f', '#c9a84c', '#ffffff', '#f5f5f5'] },
  { value: 'teal_coral', label: 'Teal & Coral', colors: ['#0d7377', '#e8614d', '#ffffff', '#f0fafa'] },
  { value: 'slate_emerald', label: 'Slate & Emerald', colors: ['#334155', '#059669', '#ffffff', '#f8fafc'] },
  { value: 'midnight_blue', label: 'Midnight Blue', colors: ['#1e293b', '#3b82f6', '#ffffff', '#f1f5f9'] },
  { value: 'charcoal_red', label: 'Charcoal & Red', colors: ['#1f2937', '#dc2626', '#ffffff', '#f9fafb'] },
  { value: 'forest_cream', label: 'Forest & Cream', colors: ['#14532d', '#a3e635', '#fefce8', '#f0fdf4'] },
  { value: 'purple_gold', label: 'Purple & Gold', colors: ['#4c1d95', '#f59e0b', '#ffffff', '#faf5ff'] },
  { value: 'monochrome', label: 'Monochrome', colors: ['#111827', '#6b7280', '#ffffff', '#f3f4f6'] },
];

const DESIGN_STYLES = [
  { value: 'modern', label: 'Modern', desc: 'Clean lines, bold headings, minimal' },
  { value: 'classic', label: 'Classic', desc: 'Traditional IB style, formal layout' },
  { value: 'playful', label: 'Playful', desc: 'Rounded corners, vibrant, friendly' },
  { value: 'minimal', label: 'Minimal', desc: 'Maximum whitespace, understated' },
  { value: 'corporate', label: 'Corporate', desc: 'Structured grids, professional' },
];

function ColorDots({ colors }: { colors: string[] }) {
  return (
    <div className="flex -space-x-0.5">
      {colors.slice(0, 4).map((c, i) => (
        <div
          key={i}
          className="w-3 h-3 rounded-full border border-white shadow-sm"
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  );
}

interface Props {
  token: string;
  onCreated: (id: string) => void;
}

export function CreatePitchbook({ token, onCreated }: Props) {
  const [company, setCompany] = useState('');
  const [ticker, setTicker] = useState('');
  const [pbType, setPbType] = useState('');
  const [txType, setTxType] = useState('');
  const [colorTheme, setColorTheme] = useState('navy_gold');
  const [designStyle, setDesignStyle] = useState('modern');
  const [context, setContext] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const [tickerResults, setTickerResults] = useState<any[]>([]);
  const [showTickerDropdown, setShowTickerDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleTickerSearch = (q: string) => {
    setTicker(q.toUpperCase());
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 1) {
      setTickerResults([]);
      setShowTickerDropdown(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await apiClient<any>(`/api/companies/search?q=${encodeURIComponent(q)}`, { token });
        setTickerResults(res.data || []);
        setShowTickerDropdown(true);
      } catch {
        setTickerResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 500);
  };

  const handleCreate = async () => {
    if (!company.trim()) { setError('Company name is required'); return; }
    if (!pbType) { setError('Please select a pitch book type'); return; }
    setError('');
    setIsCreating(true);

    try {
      const title = `${company} — ${PB_TYPES.find(t => t.value === pbType)?.label || pbType}`;
      const res = await apiClient<any>('/api/pitchbooks', {
        method: 'POST',
        token,
        body: JSON.stringify({
          title,
          company: company.trim(),
          ticker: ticker || undefined,
          pb_type: pbType,
          transaction_type: txType || undefined,
          color_theme: colorTheme,
          design_style: designStyle,
          additional_context: context || undefined,
        }),
      });
      onCreated(res.data.id);
    } catch (err: any) {
      setError(err.message || 'Failed to create');
    } finally {
      setIsCreating(false);
    }
  };

  // Build theme dropdown options with color dots
  const themeOptions = COLOR_THEMES.map(t => ({
    value: t.value,
    label: t.label,
    render: (
      <div className="flex items-center gap-2">
        <ColorDots colors={t.colors} />
        <span>{t.label}</span>
      </div>
    ),
  }));

  return (
    <div className="p-4 overflow-y-auto h-full">
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <h2 className="text-sm font-bold text-gray-900">New Pitch Book</h2>
        </div>
        <p className="text-xs text-gray-500">AI will generate slides directly into your presentation.</p>
      </div>

      <div className="space-y-3">
        {/* Company */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Company *</label>
          <input
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="e.g. Apple Inc."
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Ticker */}
        <div className="relative">
          <label className="block text-xs font-medium text-gray-700 mb-1">Ticker</label>
          <div className="relative h-9">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={ticker}
              onChange={(e) => handleTickerSearch(e.target.value)}
              onFocus={() => { if (tickerResults.length > 0) setShowTickerDropdown(true); }}
              onBlur={() => setTimeout(() => setShowTickerDropdown(false), 200)}
              placeholder="Search ticker..."
              className="w-full h-full pl-8 pr-8 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {isSearching && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-gray-400 pointer-events-none" />}
          </div>
          {showTickerDropdown && tickerResults.length > 0 && (
            <div className="absolute z-50 top-full mt-1 w-full bg-white border rounded-lg shadow-lg max-h-40 overflow-y-auto">
              {tickerResults.map((r: any) => (
                <button
                  key={r.symbol}
                  type="button"
                  onMouseDown={() => {
                    setTicker(r.symbol);
                    setCompany(r.name);
                    setShowTickerDropdown(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm border-b last:border-b-0"
                >
                  <span className="font-semibold">{r.symbol}</span>
                  <span className="text-xs text-gray-500 ml-2">{r.exchange}</span>
                  <p className="text-xs text-gray-400 truncate">{r.name}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Pitch Book Type */}
        <Dropdown
          label="Pitch Book Type"
          required
          options={PB_TYPES}
          value={pbType}
          onChange={setPbType}
          placeholder="Select pitch book type..."
        />

        {/* Transaction Type */}
        <Dropdown
          label="Transaction Type"
          options={TX_TYPES}
          value={txType}
          onChange={setTxType}
          placeholder="Select transaction type..."
        />

        {/* Color Theme */}
        <Dropdown
          label="Color Theme"
          options={themeOptions}
          value={colorTheme}
          onChange={setColorTheme}
          placeholder="Select color theme..."
        />

        {/* Design Style */}
        <Dropdown
          label="Design Style"
          options={DESIGN_STYLES}
          value={designStyle}
          onChange={setDesignStyle}
          placeholder="Select design style..."
        />

        {/* Additional context */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Additional Context</label>
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Any specific instructions for the AI..."
            rows={3}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {error && (
          <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}

        {/* Generate */}
        <button
          onClick={handleCreate}
          disabled={isCreating || !company.trim() || !pbType}
          className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isCreating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Generate Pitch Book
            </>
          )}
        </button>
      </div>
    </div>
  );
}
