'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { Loader2, Plus, Trash2, GripVertical, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertDialog } from '@/components/ui/alert-dialog';
import { Breadcrumb } from '@/components/app/breadcrumb';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import { useAuth } from '@/providers/auth-provider';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';

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

export default function LayoutDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { session } = useAuth();
  const deckId = params.id as string;

  const [deckType, setDeckType] = useState<any>(null);
  const [slides, setSlides] = useState<SlideEntry[]>([]);
  const [savedSlides, setSavedSlides] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [pendingNavUrl, setPendingNavUrl] = useState<string | null>(null);

  const token = session?.access_token;
  const isDirty = JSON.stringify(slides) !== savedSlides;

  // Block all navigation (sidebar, breadcrumb, browser) when dirty
  const { proceed } = useUnsavedChanges(isDirty, useCallback((url: string) => {
    setPendingNavUrl(url);
    setShowDiscardDialog(true);
  }, []));

  const confirmDiscard = () => {
    setShowDiscardDialog(false);
    if (pendingNavUrl) {
      proceed(pendingNavUrl);
      setPendingNavUrl(null);
    }
  };

  useEffect(() => {
    if (!token || !deckId) return;
    apiClient<any>('/api/deck-types', { token })
      .then(res => {
        const dt = (res.data || []).find((d: any) => d.id === deckId);
        if (dt) {
          setDeckType(dt);
          const sorted = (dt.deck_type_slides || []).sort((a: any, b: any) => a.slide_index - b.slide_index);
          setSlides(sorted);
          setSavedSlides(JSON.stringify(sorted));
        } else {
          toast.error('Deck type not found');
          router.push('/layouts');
        }
      })
      .catch(() => {
        toast.error('Failed to load');
        router.push('/layouts');
      })
      .finally(() => setIsLoading(false));
  }, [token, deckId]);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = [...slides];
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    setSlides(items.map((s, i) => ({ ...s, slide_index: i })));
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

  const save = async () => {
    if (!token) return;
    setIsSaving(true);
    try {
      await apiClient<any>(`/api/deck-types/${deckId}`, {
        method: 'PUT',
        token,
        body: JSON.stringify({ slides }),
      });
      setSavedSlides(JSON.stringify(slides));
      toast.success('Layout saved');
    } catch {
      toast.error('Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteLayout = async () => {
    if (!token) return;
    setIsDeleting(true);
    try {
      await apiClient<any>(`/api/deck-types/${deckId}`, { method: 'DELETE', token });
      toast.success('Deck type deleted');
      proceed('/layouts');
    } catch {
      toast.error('Failed to delete');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
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
      {/* Breadcrumb row — buttons aligned here */}
      <div className="flex items-center justify-between">
        <Breadcrumb
          items={[
            { label: 'Deck Layouts', href: '/layouts' },
            { label: deckType?.label || 'Layout' },
          ]}
        />
        <div className="flex items-center gap-2">
          <Button
            data-testid="layout-detail-delete-btn"
            variant="outline"
            size="sm"
            className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300 dark:hover:bg-red-950"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete Layout
          </Button>
          <Button data-testid="layout-detail-add-btn" variant="outline" size="sm" onClick={addSlide} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            Add Slide
          </Button>
          <Button data-testid="layout-detail-save-btn" size="sm" onClick={save} disabled={isSaving || !isDirty} className="gap-1.5">
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Title */}
      <div className="-mt-3">
        <h1 data-testid="layout-detail-heading" className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>{deckType?.label}</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-0.5">{deckType?.description} &middot; {slides.length} slides</p>
      </div>

      {/* Slides list with drag and drop */}
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="slides">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-3">
              {slides.map((slide, idx) => (
                <Draggable key={`slide-${idx}`} draggableId={`slide-${idx}`} index={idx}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      data-testid={`layout-slide-${idx}`}
                      className={`rounded-lg border p-4 transition-shadow ${
                        snapshot.isDragging
                          ? 'shadow-lg border-[var(--primary)]'
                          : 'shadow-sm'
                      }`}
                      style={{
                        backgroundColor: 'var(--background)',
                        ...provided.draggableProps.style,
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex items-center gap-2 pt-7 flex-shrink-0">
                          <div {...provided.dragHandleProps} data-testid={`layout-slide-handle-${idx}`} className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600">
                            <GripVertical className="w-5 h-5" />
                          </div>
                          <span className="text-sm font-mono text-gray-400 w-5 text-right">{idx + 1}</span>
                        </div>

                        <div className="flex-1 space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs mb-1.5">Slide Title</Label>
                              <Input
                                data-testid={`layout-slide-title-${idx}`}
                                value={slide.title}
                                onChange={(e) => updateSlide(idx, 'title', e.target.value)}
                                placeholder="e.g. Executive Summary"
                              />
                            </div>
                            <div>
                              <Label className="text-xs mb-1.5">Layout Type</Label>
                              <select
                                data-testid={`layout-slide-type-${idx}`}
                                value={slide.layout_type}
                                onChange={(e) => updateSlide(idx, 'layout_type', e.target.value)}
                                className="w-full h-10 px-3 text-sm border rounded-md bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                                style={{ color: 'var(--foreground)', borderColor: 'var(--input)' }}
                              >
                                {LAYOUT_TYPES.map(lt => (
                                  <option key={lt} value={lt}>{lt}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs mb-1.5">Description</Label>
                            <Textarea
                              data-testid={`layout-slide-desc-${idx}`}
                              value={slide.description}
                              onChange={(e) => updateSlide(idx, 'description', e.target.value)}
                              placeholder="What should this slide contain? e.g. Key investment highlights with specific data points..."
                              rows={2}
                            />
                          </div>
                        </div>

                        <button
                          data-testid={`layout-slide-delete-${idx}`}
                          onClick={() => removeSlide(idx)}
                          className="pt-7 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {slides.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p data-testid="layout-detail-empty">No slides yet. Click &ldquo;Add Slide&rdquo; to get started.</p>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={deleteLayout}
        title="Delete Deck Layout"
        description={`Are you sure you want to delete "${deckType?.label}"? This will permanently remove the layout and all its slides. This action cannot be undone.`}
        confirmLabel="Delete Layout"
        isLoading={isDeleting}
      />

      {/* Discard changes dialog */}
      <AlertDialog
        open={showDiscardDialog}
        onClose={() => { setShowDiscardDialog(false); setPendingNavUrl(null); }}
        onConfirm={confirmDiscard}
        title="Unsaved Changes"
        description="You have unsaved changes to this layout. Are you sure you want to leave? Your changes will be lost."
        confirmLabel="Discard Changes"
        cancelLabel="Stay"
        variant="destructive"
      />
    </div>
  );
}
