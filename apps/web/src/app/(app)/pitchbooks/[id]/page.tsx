'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ChevronLeft, ChevronRight, Download, Loader2, MessageSquare,
  Send, X, FileText, AlertCircle, Trash2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { AlertDialog } from '@/components/ui/alert-dialog';
import { Breadcrumb } from '@/components/app/breadcrumb';
import { useAuth } from '@/providers/auth-provider';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';
import Link from 'next/link';

export default function PitchBookViewerPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const [pitchBook, setPitchBook] = useState<any>(null);
  const [generation, setGeneration] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [chatMessages, setChatMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch pitch book
  useEffect(() => {
    if (!session?.access_token || !id) return;
    const fetchData = async () => {
      try {
        const res = await apiClient<any>(`/api/pitchbooks/${id}`, { token: session.access_token });
        setPitchBook(res.data);

        if (res.data.status === 'generating') {
          // Poll generation status
          pollGeneration();
        }
      } catch {
        toast.error('Failed to load pitch book');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [session?.access_token, id]);

  const pollGeneration = async () => {
    if (!session?.access_token) return;
    const interval = setInterval(async () => {
      try {
        const res = await apiClient<any>(`/api/pitchbooks/${id}/generation`, { token: session.access_token });
        setGeneration(res.data);

        if (res.data.status === 'completed' || res.data.status === 'failed') {
          clearInterval(interval);
          // Refresh pitch book data
          const pbRes = await apiClient<any>(`/api/pitchbooks/${id}`, { token: session.access_token });
          setPitchBook(pbRes.data);
        }
      } catch {
        clearInterval(interval);
      }
    }, 3000);
  };

  const handleExport = async () => {
    if (!session?.access_token) return;
    try {
      const res = await apiClient<any>(`/api/pitchbooks/${id}/export`, {
        method: 'POST',
        token: session.access_token,
      });
      if (res.data?.download_url) {
        window.open(res.data.download_url, '_blank');
      } else {
        toast.success('Export started — check downloads');
      }
    } catch {
      toast.error('Failed to export');
    }
  };

  const handleSendChat = async () => {
    if (!chatInput.trim() || !session?.access_token) return;

    const userMessage = chatInput.trim();
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatInput('');
    setIsSending(true);

    try {
      const res = await apiClient<any>(`/api/pitchbooks/${id}/chat`, {
        method: 'POST',
        token: session.access_token,
        body: JSON.stringify({ message: userMessage }),
      });
      setChatMessages(prev => [...prev, { role: 'assistant', content: res.data.message }]);
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setIsSending(false);
    }
  };

  const handleDelete = async () => {
    if (!session?.access_token) return;
    setIsDeleting(true);
    try {
      await apiClient(`/api/pitchbooks/${id}`, { method: 'DELETE', token: session.access_token });
      toast.success('Pitch book deleted');
      router.push('/pitchbooks');
    } catch {
      toast.error('Failed to delete pitch book');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const slides = pitchBook?.slides_data || [];
  const slidePreviews: string[] = pitchBook?.slide_previews || [];
  const totalSlides = slidePreviews.length || slides.length;
  const currentSlideData = slides[currentSlide];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!pitchBook) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">Pitch book not found</p>
      </div>
    );
  }

  // Generation in progress
  if (pitchBook.status === 'generating') {
    return (
      <div className="max-w-lg mx-auto py-20 space-y-6">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[var(--primary)] mx-auto mb-4" />
          <h2 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>Generating Your Pitch Book</h2>
          <p className="text-gray-500 mt-2">{pitchBook.title}</p>
        </div>
        {generation && (
          <div className="space-y-3">
            <Progress value={generation.progress || 0} className="h-2" />
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>{generation.current_step || 'Starting...'}</span>
              <span>{generation.progress || 0}%</span>
            </div>
          </div>
        )}
        <p className="text-center text-sm text-gray-400">This usually takes 1-3 minutes</p>
      </div>
    );
  }

  return (
    <div className="flex h-full gap-4">
      {/* Main content - Slide viewer */}
      <div className="flex-1 flex flex-col min-w-0 p-4">
        {/* Toolbar */}
        {/* Breadcrumb row — buttons aligned here */}
        <div className="flex items-center justify-between mb-1">
          <Breadcrumb
            items={[
              { label: 'Pitch Books', href: '/pitchbooks' },
              { label: pitchBook.title },
            ]}
          />
          <div className="flex items-center gap-2">
            <Button size="sm" className="gap-2" onClick={handleExport}>
              <Download className="w-4 h-4" />
              Export .pptx
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300 dark:hover:bg-red-950" onClick={() => setShowDeleteDialog(true)}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
        {/* Title */}
        <div className="mb-4">
          <h1 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>{pitchBook.title}</h1>
          <p className="text-sm text-gray-500">{pitchBook.company} &middot; {totalSlides} slides</p>
        </div>

        {/* Slide Display */}
        {totalSlides > 0 ? (
          <>
            <div className="flex-1 flex items-center justify-center rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--background)' }}>
              <div className="w-full max-w-5xl p-4">
                <div className="aspect-[16/9] relative bg-white dark:bg-black rounded-lg overflow-hidden shadow-2xl">
                  {slidePreviews[currentSlide] ? (
                    <img
                      src={slidePreviews[currentSlide]}
                      alt={`Slide ${currentSlide + 1}${currentSlideData ? `: ${currentSlideData.title}` : ''}`}
                      className="w-full h-full object-contain"
                      draggable={false}
                    />
                  ) : currentSlideData ? (
                    /* Fallback: simple text preview if no image available */
                    <div className="w-full h-full bg-white p-8 flex flex-col">
                      <h2 className="text-2xl font-bold text-[var(--primary)] mb-4">{currentSlideData.title}</h2>
                      <p className="text-gray-500 text-sm">Preview image not available</p>
                    </div>
                  ) : null}
                </div>
                <div className="text-center mt-2">
                  <span className="text-xs text-gray-400">
                    Slide {currentSlide + 1} of {totalSlides}
                    {currentSlideData?.title ? ` — ${currentSlideData.title}` : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* Slide navigation */}
            <div className="flex items-center justify-center gap-4 mt-4">
              <Button
                variant="outline" size="icon"
                disabled={currentSlide === 0}
                onClick={() => setCurrentSlide(prev => prev - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-gray-500 min-w-[80px] text-center">
                {currentSlide + 1} / {totalSlides}
              </span>
              <Button
                variant="outline" size="icon"
                disabled={currentSlide >= totalSlides - 1}
                onClick={() => setCurrentSlide(prev => prev + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Slide thumbnails — use preview images */}
            <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
              {Array.from({ length: totalSlides }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className={`flex-shrink-0 w-36 h-20 rounded overflow-hidden transition-all ${
                    i === currentSlide
                      ? 'ring-2 ring-[var(--primary)] ring-offset-1'
                      : 'border border-gray-200 dark:border-gray-700 opacity-70 hover:opacity-100'
                  }`}
                >
                  {slidePreviews[i] ? (
                    <img
                      src={slidePreviews[i]}
                      alt={`Slide ${i + 1}`}
                      className="w-full h-full object-cover"
                      draggable={false}
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      <span className="text-[8px] text-gray-400">{slides[i]?.title || `Slide ${i + 1}`}</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </>
        ) : (
          <Card className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No slides generated yet</p>
            </div>
          </Card>
        )}
      </div>

      {/* AI Chat Panel - persistent right sidebar */}
      <div className="w-96 flex flex-col bg-white dark:bg-[var(--card)] border-l">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
            <MessageSquare className="w-4 h-4 text-[var(--primary)]" />
            AI Chat
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {chatMessages.length === 0 && (
            <div className="text-center text-sm text-gray-400 py-8">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              Ask me to edit slides, add content, or restructure your pitch book.
            </div>
          )}
          {chatMessages.map((msg, i) => (
            msg.role === 'user' ? (
              <div key={i} className="flex justify-end">
                <div className="max-w-[80%] rounded-lg px-3 py-2 text-sm bg-[var(--primary)] text-white dark:text-[var(--primary-foreground)]">
                  {msg.content}
                </div>
              </div>
            ) : (
              <div key={i} className="w-[80%] text-sm" style={{ color: 'var(--foreground)' }}>
                {msg.content}
              </div>
            )
          ))}
          {isSending && (
            <div className="py-2">
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--foreground)' }} />
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
        <div className="p-3 border-t flex gap-2">
          <Input
            placeholder="Ask AI to edit..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendChat()}
            disabled={isSending}
            className="h-10"
          />
          <Button size="icon" onClick={handleSendChat} disabled={isSending || !chatInput.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <AlertDialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title="Delete Pitch Book"
        description={`Are you sure you want to delete "${pitchBook?.title}"? This action cannot be undone.`}
        isLoading={isDeleting}
      />
    </div>
  );
}
