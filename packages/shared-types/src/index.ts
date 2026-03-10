// ── Pitch Book Types ──

export type PitchBookType =
  | 'company_overview'
  | 'market_update'
  | 'transaction_summary'
  | 'investor_pitch'
  | 'industry_overview'
  | 'fundraising_deck'
  | 'due_diligence';
export type TransactionType = 'ma' | 'capital_raising' | 'restructuring' | 'ipo' | 'debt_financing';
export type PitchBookStatus = 'draft' | 'generating' | 'completed' | 'failed';
export type GenerationStatus = 'queued' | 'analyzing_template' | 'fetching_data' | 'planning_content' | 'building_slides' | 'completed' | 'failed';

export interface PitchBook {
  id: string;
  user_id: string;
  title: string;
  company: string;
  ticker?: string;
  transaction_type: TransactionType;
  pb_type: PitchBookType;
  status: PitchBookStatus;
  slides_data: SlideData[];
  template_id?: string;
  additional_context?: string;
  file_url?: string;
  created_at: string;
  updated_at: string;
}

export interface SlideData {
  index: number;
  title: string;
  layout: string;
  content: SlideContent[];
  notes?: string;
}

export interface SlideContent {
  type: 'text' | 'table' | 'chart' | 'image' | 'list';
  placeholder: string;
  value: any;
  style?: Record<string, any>;
}

export interface Template {
  id: string;
  user_id: string;
  name: string;
  file_url: string;
  analysis_data: TemplateAnalysis;
  created_at: string;
}

export interface TemplateAnalysis {
  slide_layouts: SlideLayout[];
  color_palette: ColorPalette;
  fonts: FontSpec[];
  master_slides: MasterSlide[];
}

export interface SlideLayout {
  name: string;
  index: number;
  placeholders: Placeholder[];
  background?: string;
}

export interface Placeholder {
  idx: number;
  type: 'title' | 'body' | 'subtitle' | 'picture' | 'table' | 'chart' | 'footer' | 'date' | 'slide_number';
  left: number;
  top: number;
  width: number;
  height: number;
  font?: FontSpec;
}

export interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  colors: string[];
}

export interface FontSpec {
  name: string;
  size: number;
  bold?: boolean;
  italic?: boolean;
  color?: string;
}

export interface MasterSlide {
  name: string;
  index: number;
  layouts: string[];
}

export interface Generation {
  id: string;
  pitch_book_id: string;
  status: GenerationStatus;
  progress: number;
  current_step?: string;
  started_at: string;
  completed_at?: string;
  error?: string;
}

export interface ChatMessage {
  id: string;
  pitch_book_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: Record<string, any>;
  created_at: string;
}

// ── API Types ──

export interface CreatePitchBookRequest {
  title: string;
  company: string;
  ticker?: string;
  transaction_type: TransactionType;
  pb_type: PitchBookType;
  template_id?: string;
  additional_context?: string;
  date_range?: { start: string; end: string };
  color_theme?: string;
  design_style?: string;
}

export interface CompanyFinancials {
  ticker: string;
  name: string;
  sector: string;
  industry: string;
  market_cap: number;
  revenue: number;
  net_income: number;
  ebitda: number;
  pe_ratio: number;
  ev_ebitda: number;
  revenue_growth: number;
  profit_margin: number;
  historical: FinancialPeriod[];
}

export interface FinancialPeriod {
  period: string;
  revenue: number;
  net_income: number;
  ebitda: number;
  total_assets: number;
  total_debt: number;
  free_cash_flow: number;
}

export interface SECFiling {
  accession_number: string;
  filing_type: string;
  filing_date: string;
  description: string;
  url: string;
}

export interface CompanyNews {
  title: string;
  url: string;
  source: string;
  published_at: string;
  summary: string;
}

export interface ContentPlan {
  title: string;
  slides: ContentSlide[];
  narrative_arc: string;
}

export interface ContentSlide {
  index: number;
  title: string;
  layout: string;
  talking_points: string[];
  data_requirements: string[];
  content_blocks: ContentBlock[];
}

export interface ContentBlock {
  type: 'heading' | 'paragraph' | 'bullet_list' | 'table' | 'chart' | 'metric';
  content: any;
}

// ── API Response ──

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  limit: number;
}
