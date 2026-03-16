import { useState, useEffect } from 'react';
import { Loader2, Plus, Trash2, ArrowUp, ArrowDown, ArrowLeft, Save } from 'lucide-react';
import { apiClient } from '../lib/api';

const LAYOUT_TYPES = [
  'Title Slide', 'Section Header', 'Content Slide', 'Two Column',
  'Financial Table', 'Chart Slide', 'Key Metrics', 'Executive Summary', 'Comparison Table',
];

interface SlideEntry {
  slide_index: number;
  title: string;
  layout_type: string;
  description: string;
}

interface Props {
  token: string;
  deckType: { id: string; label: string; description: string; deck_type_slides: SlideEntry[] };
  onBack: () => void;
}

export function DeckLayoutDetail({ token, deckType, onBack }: Props) {
  const [slides, setSlides] = useState<SlideEntry[]>([]);
  const [savedSnapshot, setSavedSnapshot] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const isDirty = JSON.stringify(slides) !== savedSnapshot;

  useEffect(() => {
    const sorted = [...(deckType.deck_type_slides || [])].sort((a, b) => a.slide_index - b.slide_index);
    setSlides(sorted);
    setSavedSnapshot(JSON.stringify(sorted));
  }, [deckType]);

  const handleBack = () => {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      onBack();
    }
  };

  const updateSlide = (idx: number, field: keyof SlideEntry, value: string) => {
    setSlides(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  };

  const addSlide = () => {
    setSlides(prev => [...prev, {
      slide_index: prev.length,
      title: 'New Slide',
      layout_type: 'Content Slide',
      description: '',
    }]);
  };

  const removeSlide = (idx: number) => {
    setSlides(prev => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, slide_index: i })));
  };

  const moveSlide = (idx: number, dir: 'up' | 'down') => {
    const newIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= slides.length) return;
    setSlides(prev => {
      const items = [...prev];
      [items[idx], items[newIdx]] = [items[newIdx], items[idx]];
      return items.map((s, i) => ({ ...s, slide_index: i }));
    });
  };

  const save = async () => {
    setIsSaving(true);
    try {
      await apiClient<any>(`/api/deck-types/${deckType.id}`, {
        method: 'PUT',
        token,
        body: JSON.stringify({ slides }),
      });
      setSavedSnapshot(JSON.stringify(slides));
    } catch {} finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await apiClient<any>(`/api/deck-types/${deckType.id}`, { method: 'DELETE', token });
      onBack();
    } catch {} finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="p-3 overflow-y-auto h-full">
      {/* Header */}
      <div className="mb-3">
        <button
          onClick={handleBack}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 mb-2"
        >
          <ArrowLeft className="w-3 h-3" />
          Back to layouts
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-gray-900">{deckType.label}</h2>
            <p className="text-[10px] text-gray-400">{slides.length} slides{isDirty ? ' · unsaved changes' : ''}</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={addSlide}
              className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-gray-600 border rounded hover:bg-gray-50"
            >
              <Plus className="w-2.5 h-2.5" /> Add
            </button>
            <button
              onClick={save}
              disabled={isSaving || !isDirty}
              className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Save className="w-2.5 h-2.5" />}
              Save
            </button>
          </div>
        </div>
      </div>

      {/* Slides */}
      <div className="space-y-2">
        {slides.map((slide, idx) => (
          <div key={idx} className="border rounded-lg bg-white p-2.5">
            <div className="flex items-start gap-2">
              {/* Reorder + index */}
              <div className="flex flex-col items-center gap-0.5 pt-4 flex-shrink-0">
                <button onClick={() => moveSlide(idx, 'up')} disabled={idx === 0} className="text-gray-400 hover:text-gray-600 disabled:opacity-30">
                  <ArrowUp className="w-3 h-3" />
                </button>
                <span className="text-[10px] text-gray-400 font-mono">{idx + 1}</span>
                <button onClick={() => moveSlide(idx, 'down')} disabled={idx === slides.length - 1} className="text-gray-400 hover:text-gray-600 disabled:opacity-30">
                  <ArrowDown className="w-3 h-3" />
                </button>
              </div>

              {/* Stacked inputs */}
              <div className="flex-1 space-y-1.5">
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Slide Title</label>
                  <input
                    value={slide.title}
                    onChange={(e) => updateSlide(idx, 'title', e.target.value)}
                    placeholder="e.g. Executive Summary"
                    className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Layout Type</label>
                  <select
                    value={slide.layout_type}
                    onChange={(e) => updateSlide(idx, 'layout_type', e.target.value)}
                    className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {LAYOUT_TYPES.map(lt => <option key={lt} value={lt}>{lt}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Description</label>
                  <textarea
                    value={slide.description}
                    onChange={(e) => updateSlide(idx, 'description', e.target.value)}
                    placeholder="What should this slide contain..."
                    rows={2}
                    className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                  />
                </div>
              </div>

              {/* Delete */}
              <button
                onClick={() => removeSlide(idx)}
                className="pt-4 text-gray-400 hover:text-red-500 flex-shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom actions */}
      <div className="mt-3 pt-3 border-t">
        <button
          onClick={() => setShowDeleteConfirm(true)}
          disabled={isDeleting}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-md hover:bg-red-50 disabled:opacity-50"
        >
          <Trash2 className="w-3 h-3" />
          Delete Deck Type
        </button>
      </div>

      {/* Delete confirmation overlay */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-white rounded-lg shadow-lg p-4 max-w-xs w-full mx-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Delete Deck Layout</h3>
            <p className="text-xs text-gray-500 mb-4">
              Are you sure you want to delete &ldquo;{deckType.label}&rdquo;? This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowDeleteConfirm(false)} className="px-3 py-1.5 text-xs border rounded-md hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discard changes overlay */}
      {showDiscardConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowDiscardConfirm(false)}>
          <div className="bg-white rounded-lg shadow-lg p-4 max-w-xs w-full mx-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Unsaved Changes</h3>
            <p className="text-xs text-gray-500 mb-4">
              You have unsaved changes. Are you sure you want to leave? Your changes will be lost.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowDiscardConfirm(false)} className="px-3 py-1.5 text-xs border rounded-md hover:bg-gray-50">
                Stay
              </button>
              <button
                onClick={onBack}
                className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
