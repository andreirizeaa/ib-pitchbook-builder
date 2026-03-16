'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, Layers, ChevronRight, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/providers/auth-provider';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';

interface DeckType {
  id: string;
  name: string;
  label: string;
  description: string;
  display_order: number;
  is_default: boolean;
  deck_type_slides: any[];
}

export default function LayoutsPage() {
  const router = useRouter();
  const { session } = useAuth();
  const [deckTypes, setDeckTypes] = useState<DeckType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newDeck, setNewDeck] = useState({ label: '', description: '' });
  const [creatingNew, setCreatingNew] = useState(false);

  const token = session?.access_token;

  useEffect(() => {
    if (!token) return;
    apiClient<any>('/api/deck-types', { token })
      .then(res => setDeckTypes(res.data || []))
      .catch(() => toast.error('Failed to load deck types'))
      .finally(() => setIsLoading(false));
  }, [token]);

  const createDeckType = async () => {
    if (!token || !newDeck.label) return;
    setCreatingNew(true);
    try {
      const res = await apiClient<any>('/api/deck-types', {
        method: 'POST',
        token,
        body: JSON.stringify({
          name: newDeck.label.toLowerCase().replace(/\s+/g, '_'),
          label: newDeck.label,
          description: newDeck.description,
          slides: [
            { title: 'Title Slide', layout_type: 'Title Slide', description: 'Cover slide with company name and date' },
            { title: 'Executive Summary', layout_type: 'Executive Summary', description: 'Key highlights and investment thesis' },
            { title: 'Content', layout_type: 'Content Slide', description: 'Main content and analysis' },
          ],
        }),
      });
      setNewDeck({ label: '', description: '' });
      setShowNewForm(false);
      toast.success('Deck type created');
      setDeckTypes(prev => [...prev, res.data]);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create');
    } finally {
      setCreatingNew(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 data-testid="layouts-heading" className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Deck Layouts</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Customise slide structures for each pitch book type</p>
        </div>
        <Button data-testid="layouts-new-btn" onClick={() => setShowNewForm(!showNewForm)} variant={showNewForm ? 'outline' : 'default'} className="gap-2">
          {showNewForm ? <><X className="w-4 h-4" /> Cancel</> : <><Plus className="w-4 h-4" /> New Deck Type</>}
        </Button>
      </div>

      {showNewForm && (
        <Card data-testid="layouts-new-form">
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>Name</label>
                <Input
                  data-testid="layouts-new-name"
                  placeholder="e.g. Equity Research"
                  value={newDeck.label}
                  onChange={(e) => setNewDeck(prev => ({ ...prev, label: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>Description</label>
                <Input
                  data-testid="layouts-new-desc"
                  placeholder="Short description of this deck type"
                  value={newDeck.description}
                  onChange={(e) => setNewDeck(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
            </div>
            <Button data-testid="layouts-new-create" onClick={createDeckType} disabled={creatingNew || !newDeck.label} className="gap-2">
              {creatingNew ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Create
            </Button>
          </CardContent>
        </Card>
      )}

      {deckTypes.length === 0 ? (
        <Card>
          <CardContent className="text-center py-16">
            <Layers className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">No deck layouts yet</p>
            <p className="text-sm text-gray-400">Create a deck type to define your standard slide structures</p>
          </CardContent>
        </Card>
      ) : (
        <div data-testid="layouts-grid" className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {deckTypes.map((dt) => (
            <Card
              key={dt.id}
              data-testid={`layout-card-${dt.id}`}
              className="cursor-pointer hover:border-[var(--primary)] hover:shadow-md transition-all group"
              onClick={() => router.push(`/layouts/${dt.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-blue-600 dark:bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Layers className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate" style={{ color: 'var(--foreground)' }}>{dt.label}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{dt.description}</p>
                      <p className="text-xs text-gray-400 mt-1">{(dt.deck_type_slides || []).length} slides</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[var(--primary)] transition-colors flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
