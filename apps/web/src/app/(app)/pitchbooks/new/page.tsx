'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Upload, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/providers/auth-provider';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';

const pbTypes = [
  { value: 'company_overview', label: 'Company Overview', desc: 'Business overview, financials, and market position' },
  { value: 'market_update', label: 'Market Update', desc: 'Sector trends, M&A activity, and market outlook' },
  { value: 'transaction_summary', label: 'Transaction Summary', desc: 'Deal structure, rationale, and financial analysis' },
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
    pb_type: 'company_overview',
    transaction_type: 'ma',
    additional_context: '',
  });
  const [templateFile, setTemplateFile] = useState<File | null>(null);

  const updateForm = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.title || !form.company) {
      toast.error('Please fill in the required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      // Upload template first if provided
      let templateId: string | undefined;
      if (templateFile && session?.access_token) {
        const formData = new FormData();
        formData.append('file', templateFile);
        formData.append('name', templateFile.name);

        const uploadRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/templates/analyze`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: formData,
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          templateId = uploadData.data?.id;
        }
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
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">New Pitch Book</h1>
        <p className="text-gray-500 mt-1">Fill in the details and let AI generate your pitch book.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
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
                value={form.title} onChange={(e) => updateForm('title', e.target.value)}
                className="h-12"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company">Company Name *</Label>
                <Input
                  id="company" placeholder="e.g. Apple Inc."
                  value={form.company} onChange={(e) => updateForm('company', e.target.value)}
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ticker">Ticker Symbol</Label>
                <Input
                  id="ticker" placeholder="e.g. AAPL"
                  value={form.ticker} onChange={(e) => updateForm('ticker', e.target.value.toUpperCase())}
                  className="h-12"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pitch Book Type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pitch Book Type</CardTitle>
            <CardDescription>Select the type of presentation to generate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {pbTypes.map((type) => (
                <label
                  key={type.value}
                  className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                    form.pb_type === type.value ? 'border-[#003366] bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio" name="pb_type" value={type.value}
                    checked={form.pb_type === type.value}
                    onChange={(e) => updateForm('pb_type', e.target.value)}
                    className="mt-1"
                  />
                  <div>
                    <p className="font-medium text-gray-900">{type.label}</p>
                    <p className="text-sm text-gray-500">{type.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Transaction Type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Transaction Context</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>Transaction Type</Label>
              <div className="flex flex-wrap gap-2">
                {txTypes.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => updateForm('transaction_type', type.value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      form.transaction_type === type.value
                        ? 'bg-[#003366] text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Template Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Reference Template</CardTitle>
            <CardDescription>Upload your firm&apos;s .pptx template (optional — defaults will be used otherwise)</CardDescription>
          </CardHeader>
          <CardContent>
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <div className="flex flex-col items-center gap-2">
                <Upload className="w-8 h-8 text-gray-400" />
                <p className="text-sm text-gray-500">
                  {templateFile ? templateFile.name : 'Click to upload .pptx template'}
                </p>
              </div>
              <input
                type="file"
                accept=".pptx"
                className="hidden"
                onChange={(e) => setTemplateFile(e.target.files?.[0] || null)}
              />
            </label>
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
              value={form.additional_context}
              onChange={(e) => updateForm('additional_context', e.target.value)}
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="gap-2">
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
