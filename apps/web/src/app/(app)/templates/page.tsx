'use client';

import { useEffect, useState, useRef } from 'react';
import { Upload, Loader2, LayoutTemplate, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/providers/auth-provider';
import { apiClient, API_URL } from '@/lib/api';
import { toast } from 'sonner';

export default function TemplatesPage() {
  const { session } = useAuth();
  const [templates, setTemplates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!session?.access_token) return;
    apiClient<any>('/api/templates', { token: session.access_token })
      .then(res => setTemplates(res.data || []))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [session?.access_token]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !session?.access_token) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', file.name);

      const res = await fetch(`${API_URL}/api/templates/analyze`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });

      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      setTemplates(prev => [data.data, ...prev]);
      toast.success('Template uploaded and analysed');
    } catch {
      toast.error('Failed to upload template');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 data-testid="templates-heading" className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Templates</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Upload and manage your pitch book templates</p>
        </div>
        <div>
          <Button
            data-testid="templates-upload-btn"
            className="gap-2"
            disabled={isUploading}
            type="button"
            onClick={() => !isUploading && fileInputRef.current?.click()}
          >
            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Upload Template
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pptx"
            className="hidden"
            onChange={handleUpload}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="text-center py-16">
            <LayoutTemplate className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">No templates uploaded yet</p>
            <p className="text-sm text-gray-400">Upload a .pptx file to use as a reference template for generation</p>
          </CardContent>
        </Card>
      ) : (
        <div data-testid="templates-grid" className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((tmpl) => (
            <Card key={tmpl.id} data-testid={`template-card-${tmpl.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 dark:bg-blue-500 rounded-lg flex items-center justify-center">
                      <LayoutTemplate className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium" style={{ color: 'var(--foreground)' }}>{tmpl.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(tmpl.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
