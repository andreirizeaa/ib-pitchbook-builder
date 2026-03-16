import { useState, useEffect } from 'react';
import { Loader2, Plus, ChevronRight, Layers } from 'lucide-react';
import { apiClient } from '../lib/api';

interface DeckType {
  id: string;
  name: string;
  label: string;
  description: string;
  display_order: number;
  deck_type_slides: any[];
}

interface Props {
  token: string;
  onOpenDeck: (deckType: DeckType) => void;
}

export function DeckLayouts({ token, onOpenDeck }: Props) {
  const [deckTypes, setDeckTypes] = useState<DeckType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creatingNew, setCreatingNew] = useState(false);

  const fetchDeckTypes = async () => {
    try {
      const res = await apiClient<any>('/api/deck-types', { token });
      setDeckTypes(res.data || []);
    } catch {} finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchDeckTypes(); }, [token]);

  const createDeckType = async () => {
    if (!newLabel) return;
    setCreatingNew(true);
    try {
      await apiClient<any>('/api/deck-types', {
        method: 'POST',
        token,
        body: JSON.stringify({
          name: newLabel.toLowerCase().replace(/\s+/g, '_'),
          label: newLabel,
          description: newDesc,
          slides: [
            { title: 'Title Slide', layout_type: 'Title Slide', description: 'Cover slide' },
            { title: 'Executive Summary', layout_type: 'Executive Summary', description: 'Key highlights' },
            { title: 'Content', layout_type: 'Content Slide', description: 'Main content' },
          ],
        }),
      });
      setNewLabel('');
      setNewDesc('');
      setShowNewForm(false);
      await fetchDeckTypes();
    } catch {} finally {
      setCreatingNew(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-3 overflow-y-auto h-full">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-bold text-gray-900">Deck Layouts</h2>
          <p className="text-[10px] text-gray-400 mt-0.5">Customise slide structures per deck type</p>
        </div>
        <button
          onClick={() => setShowNewForm(!showNewForm)}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          <Plus className="w-3.5 h-3.5" />
          New
        </button>
      </div>

      {showNewForm && (
        <div className="mb-3 p-2.5 border rounded-lg bg-white space-y-2">
          <div>
            <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Name</label>
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="e.g. Equity Research"
              className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Description</label>
            <input
              type="text"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Short description"
              className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={createDeckType}
              disabled={creatingNew || !newLabel}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {creatingNew ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
              Create
            </button>
            <button
              onClick={() => { setShowNewForm(false); setNewLabel(''); setNewDesc(''); }}
              className="px-2.5 py-1.5 text-xs text-gray-600 border rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {deckTypes.length === 0 ? (
        <div className="text-center py-8">
          <Layers className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-xs text-gray-500">No deck layouts yet</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {deckTypes.map((dt) => (
            <button
              key={dt.id}
              onClick={() => onOpenDeck(dt)}
              className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-900 truncate">{dt.label}</p>
                  <p className="text-[10px] text-gray-400 truncate">{dt.description}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{(dt.deck_type_slides || []).length} slides</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500 flex-shrink-0" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
