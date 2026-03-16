'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, FileText, CheckCircle, Loader2, AlertCircle, Clock, Search, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertDialog } from '@/components/ui/alert-dialog';
import { useAuth } from '@/providers/auth-provider';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';

export default function PitchBooksListPage() {
  const { session } = useAuth();
  const [pitchBooks, setPitchBooks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!session?.access_token) return;
    apiClient<any>('/api/pitchbooks?limit=50', { token: session.access_token })
      .then(res => setPitchBooks(res.data || []))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [session?.access_token]);

  const handleDelete = async () => {
    if (!deleteTarget || !session?.access_token) return;
    setIsDeleting(true);
    try {
      await apiClient(`/api/pitchbooks/${deleteTarget.id}`, { method: 'DELETE', token: session.access_token });
      setPitchBooks(prev => prev.filter(pb => pb.id !== deleteTarget.id));
      toast.success('Pitch book deleted');
    } catch {
      toast.error('Failed to delete pitch book');
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const filtered = pitchBooks.filter(pb =>
    pb.title?.toLowerCase().includes(search.toLowerCase()) ||
    pb.company?.toLowerCase().includes(search.toLowerCase())
  );

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      completed: 'bg-green-100 text-green-700',
      generating: 'bg-blue-100 text-blue-700',
      failed: 'bg-red-100 text-red-700',
      draft: 'bg-gray-100 text-gray-700',
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.draft}`}>
        {status === 'generating' && <Loader2 className="w-3 h-3 animate-spin" />}
        {status === 'completed' && <CheckCircle className="w-3 h-3" />}
        {status === 'failed' && <AlertCircle className="w-3 h-3" />}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }} data-testid="pitchbooks-heading">Pitch Books</h1>
        <Link href="/pitchbooks/new" data-testid="pitchbooks-new-btn">
          <Button className="gap-2"><Plus className="w-4 h-4" /> New Pitch Book</Button>
        </Link>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search pitch books..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
          data-testid="pitchbooks-search"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="text-center py-16">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">
              {search ? 'No pitch books match your search' : 'No pitch books yet. Create your first one!'}
            </p>
            {!search && (
              <Link href="/pitchbooks/new">
                <Button variant="outline" className="gap-2"><Plus className="w-4 h-4" /> Create Pitch Book</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filtered.map((pb) => (
            <Card key={pb.id} className="hover:shadow-md transition-shadow cursor-pointer" data-testid={`pitchbook-card-${pb.id}`}>
              <CardContent className="p-4 flex items-center justify-between">
                <Link href={`/pitchbooks/${pb.id}`} className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-10 h-10 bg-blue-600 dark:bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate" style={{ color: 'var(--foreground)' }}>{pb.title}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {pb.company} · {pb.pb_type?.replace('_', ' ')} · {new Date(pb.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </Link>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {statusBadge(pb.status)}
                  <button
                    onClick={(e) => { e.preventDefault(); setDeleteTarget(pb); }}
                    className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                    data-testid={`pitchbook-delete-${pb.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Pitch Book"
        description={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
        isLoading={isDeleting}
      />
    </div>
  );
}
