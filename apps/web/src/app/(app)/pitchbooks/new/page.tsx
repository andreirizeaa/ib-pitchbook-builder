'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Upload, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { TickerSearch } from '@/components/app/ticker-search';
import { useAuth } from '@/providers/auth-provider';
import { apiClient, API_URL } from '@/lib/api';
import { toast } from 'sonner';

const pbTypes = [
  { value: 'company_overview', label: 'Company Overview', desc: 'Business overview, financials, and market position' },
  { value: 'investor_pitch', label: 'Investor Pitch', desc: 'Investment thesis, opportunity, and returns potential' },
  { value: 'market_update', label: 'Market Update', desc: 'Sector trends, M&A activity, and market outlook' },
  { value: 'transaction_summary', label: 'Transaction Summary', desc: 'Deal structure, rationale, and financial analysis' },
  { value: 'industry_overview', label: 'Industry Overview', desc: 'Sector landscape, key players, and market dynamics' },
  { value: 'fundraising_deck', label: 'Fundraising Deck', desc: 'Capital raise story, use of proceeds, and projections' },
  { value: 'due_diligence', label: 'Due Diligence', desc: 'Deep-dive analysis, risks, and financial audit' },
];

const txTypes = [
  { value: 'ma', label: 'Mergers & Acquisitions' },
  { value: 'capital_raising', label: 'Capital Raising' },
  { value: 'ipo', label: 'IPO' },
  { value: 'restructuring', label: 'Restructuring' },
  { value: 'debt_financing', label: 'Debt Financing' },
];

export default function NewPitchBookPage() {
  const router = useRouter();
  const { session } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    company: '',
    ticker: '',
    pb_type: '',
    transaction_type: '',
    additional_context: '',
  });
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [templateMode, setTemplateMode] = useState<'existing' | 'upload'>('existing');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const updateForm = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  useEffect(() => {
    if (!session?.access_token) return;

    setIsLoadingTemplates(true);
    apiClient<any>('/api/templates', { token: session.access_token })
      .then(res => setTemplates(res.data || []))
      .catch(() => {})
      .finally(() => setIsLoadingTemplates(false));
  }, [session?.access_token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.title || !form.company || !form.pb_type) {
      toast.error('Please fill in the required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      // Resolve templateId based on mode
      let templateId: string | undefined;

      if (templateMode === 'existing') {
        templateId = selectedTemplateId || undefined;
      } else if (templateMode === 'upload' && templateFile && session?.access_token) {
        const formData = new FormData();
        formData.append('file', templateFile);
        formData.append('name', templateFile.name);

        const uploadRes = await fetch(`${API_URL}/api/templates/analyze`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: formData,
        });

        if (!uploadRes.ok) {
          throw new Error('Failed to upload template');
        }

        const uploadData = await uploadRes.json();
        templateId = uploadData.data?.id;
      }

      const res = await apiClient<any>('/api/pitchbooks', {
        method: 'POST',
        token: session?.access_token,
        body: JSON.stringify({ ...form, template_id: templateId }),
      });

      toast.success('Pitch book generation started!');
      router.push(`/pitchbooks/${res.data.id}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create pitch book');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-4">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }} data-testid="new-pb-heading">New Pitch Book</h1>
        <p className="text-gray-500 mt-1">Fill in the details and let AI generate your pitch book.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6" data-testid="new-pb-form">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Basic Information</CardTitle>
            <CardDescription>Company and presentation details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Pitch Book Title *</Label>
              <Input
                id="title" placeholder="e.g. Apple Inc. — Company Overview Q1 2026"
                data-testid="new-pb-title"
                value={form.title} onChange={(e) => updateForm('title', e.target.value)}
                className="h-12"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company">Company Name *</Label>
                <Input
                  id="company" placeholder="e.g. Apple Inc."
                  data-testid="new-pb-company"
                  value={form.company} onChange={(e) => updateForm('company', e.target.value)}
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ticker">Ticker Symbol</Label>
                <TickerSearch
                  value={form.ticker}
                  onChange={(ticker) => updateForm('ticker', ticker)}
                  onCompanySelect={(name) => updateForm('company', name)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pitch Book Type & Transaction Type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Presentation Details</CardTitle>
            <CardDescription>Select the type of presentation and transaction context</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pb_type">Pitch Book Type *</Label>
              <select
                id="pb_type"
                data-testid="new-pb-type"
                value={form.pb_type}
                onChange={(e) => updateForm('pb_type', e.target.value)}
                className="w-full h-12 px-3 rounded-md border border-[var(--input)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                style={{ color: form.pb_type ? 'var(--foreground)' : 'var(--muted-foreground)' }}
              >
                <option value="" disabled>Select pitch book type...</option>
                {pbTypes.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
              {form.pb_type && (
                <p className="text-xs text-[var(--muted-foreground)]">
                  {pbTypes.find(t => t.value === form.pb_type)?.desc}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="tx_type">Transaction Type</Label>
              <select
                id="tx_type"
                data-testid="new-pb-tx-type"
                value={form.transaction_type}
                onChange={(e) => updateForm('transaction_type', e.target.value)}
                className="w-full h-12 px-3 rounded-md border border-[var(--input)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                style={{ color: form.transaction_type ? 'var(--foreground)' : 'var(--muted-foreground)' }}
              >
                <option value="" disabled>Select transaction type...</option>
                {txTypes.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Template selection / upload */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Reference Template</CardTitle>
            <CardDescription>
              Use one of your existing templates or upload a new .pptx (optional — defaults will be used otherwise).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Mode toggle */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setTemplateMode('existing')}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  templateMode === 'existing'
                    ? 'border-[var(--primary)] bg-[var(--primary)] text-white dark:text-[var(--primary-foreground)]'
                    : 'border-gray-200 hover:bg-gray-50 dark:hover:bg-[var(--accent)]'
                }`}
                style={templateMode !== 'existing' ? { color: 'var(--foreground)' } : undefined}
              >
                Use existing template
              </button>
              <button
                type="button"
                onClick={() => setTemplateMode('upload')}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  templateMode === 'upload'
                    ? 'border-[var(--primary)] bg-[var(--primary)] text-white dark:text-[var(--primary-foreground)]'
                    : 'border-gray-200 hover:bg-gray-50 dark:hover:bg-[var(--accent)]'
                }`}
                style={templateMode !== 'upload' ? { color: 'var(--foreground)' } : undefined}
              >
                Upload new template
              </button>
            </div>

            {templateMode === 'existing' ? (
              <div className="space-y-3">
                {isLoadingTemplates ? (
                  <div className="flex items-center justify-center py-8 text-sm text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Loading templates...
                  </div>
                ) : templates.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    You don&apos;t have any templates yet. You can switch to &quot;Upload new template&quot; or create one on the
                    Templates page.
                  </p>
                ) : (
                  <div className="grid gap-3">
                    {templates.map((tmpl) => (
                      <label
                        key={tmpl.id}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedTemplateId === tmpl.id
                            ? 'border-[var(--primary)] bg-[var(--primary)]'
                            : 'border-gray-200 hover:bg-gray-50 dark:hover:bg-[var(--accent)]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="template"
                            value={tmpl.id}
                            checked={selectedTemplateId === tmpl.id}
                            onChange={() => setSelectedTemplateId(tmpl.id)}
                            className="mt-0.5 accent-white"
                          />
                          <div>
                            <p className="font-medium" style={{ color: selectedTemplateId === tmpl.id ? 'white' : 'var(--foreground)' }}>{tmpl.name}</p>
                            <p className={`text-xs ${selectedTemplateId === tmpl.id ? 'text-white/80' : 'text-gray-500'}`}>
                              {new Date(tmpl.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-gray-400" />
                    <p className="text-sm text-gray-500">
                      {templateFile ? templateFile.name : 'Click to upload .pptx template'}
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pptx"
                    className="hidden"
                    onChange={(e) => setTemplateFile(e.target.files?.[0] || null)}
                  />
                </label>
                <p className="mt-2 text-xs text-gray-400">
                  The uploaded template will be stored and available under your Templates.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Additional Context */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Additional Context</CardTitle>
            <CardDescription>Any specific instructions or context for the AI</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="e.g. Focus on the company's cloud computing division. Include comparison with AWS and Azure. Emphasise recent M&A activity..."
              data-testid="new-pb-context"
              value={form.additional_context}
              onChange={(e) => updateForm('additional_context', e.target.value)}
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()} data-testid="new-pb-cancel">
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="gap-2" data-testid="new-pb-submit">
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
            ) : (
              <><Sparkles className="w-4 h-4" /> Generate Pitch Book</>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
