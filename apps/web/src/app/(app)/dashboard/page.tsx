'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, FileText, Clock, CheckCircle, AlertCircle, Loader2, BarChart3, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/providers/auth-provider';
import { apiClient } from '@/lib/api';

interface PitchBookSummary {
  id: string;
  title: string;
  company: string;
  status: string;
  pb_type: string;
  created_at: string;
}

export default function DashboardPage() {
  const { session } = useAuth();
  const [pitchBooks, setPitchBooks] = useState<PitchBookSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, completed: 0, generating: 0 });

  useEffect(() => {
    if (!session?.access_token) return;

    apiClient<any>('/api/pitchbooks?limit=5', { token: session.access_token })
      .then(res => {
        setPitchBooks(res.data || []);
        const all = res.data || [];
        setStats({
          total: res.total || all.length,
          completed: all.filter((pb: any) => pb.status === 'completed').length,
          generating: all.filter((pb: any) => pb.status === 'generating').length,
        });
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [session?.access_token]);

  const statusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'generating': return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'failed': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const formatPbType = (type: string) => ({
    company_overview: 'Company Overview',
    market_update: 'Market Update',
    transaction_summary: 'Transaction Summary',
  }[type] || type);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Generate and manage your pitch books</p>
        </div>
        <Link href="/pitchbooks/new">
          <Button className="gap-2">
            <Plus className="w-4 h-4" /> New Pitch Book
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-[#003366]" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Pitch Books</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">In Progress</p>
                <p className="text-2xl font-bold text-gray-900">{stats.generating}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Pitch Books */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Recent Pitch Books</CardTitle>
            <Link href="/pitchbooks" className="text-sm text-[#003366] hover:underline">
              View all →
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : pitchBooks.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No pitch books yet</p>
              <Link href="/pitchbooks/new">
                <Button variant="outline" className="gap-2">
                  <Plus className="w-4 h-4" /> Create your first pitch book
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {pitchBooks.map((pb) => (
                <Link
                  key={pb.id}
                  href={`/pitchbooks/${pb.id}`}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {statusIcon(pb.status)}
                    <div>
                      <p className="font-medium text-gray-900">{pb.title}</p>
                      <p className="text-sm text-gray-500">{pb.company} · {formatPbType(pb.pb_type)}</p>
                    </div>
                  </div>
                  <div className="text-sm text-gray-400">
                    {new Date(pb.created_at).toLocaleDateString()}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
