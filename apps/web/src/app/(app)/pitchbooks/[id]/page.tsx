'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ChevronLeft, ChevronRight, Download, Loader2, MessageSquare,
  Send, X, ArrowLeft, FileText, AlertCircle,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
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
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const slides = pitchBook?.slides_data || [];
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
          <Loader2 className="w-12 h-12 animate-spin text-[#003366] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900">Generating Your Pitch Book</h2>
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
    <div className="flex h-[calc(100vh-7rem)] gap-4">
      {/* Main content - Slide viewer */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Link href="/pitchbooks">
              <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900">{pitchBook.title}</h1>
              <p className="text-sm text-gray-500">{pitchBook.company} · {slides.length} slides</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setChatOpen(!chatOpen)}>
              <MessageSquare className="w-4 h-4" />
              AI Chat
            </Button>
            <Button size="sm" className="gap-2" onClick={handleExport}>
              <Download className="w-4 h-4" />
              Export .pptx
            </Button>
          </div>
        </div>

        {/* Slide Display */}
        {slides.length > 0 ? (
          <>
            <Card className="flex-1 flex items-center justify-center bg-white overflow-hidden">
              <CardContent className="w-full max-w-4xl p-8">
                <div className="aspect-[16/9] bg-white border rounded-lg shadow-inner p-8 flex flex-col">
                  {currentSlideData && (
                    <>
                      <h2 className="text-2xl font-bold text-[#003366] mb-4">
                        {currentSlideData.title}
                      </h2>
                      <div className="flex-1 overflow-auto">
                        {currentSlideData.content?.map((block: any, i: number) => (
                          <div key={i} className="mb-3">
                            {block.type === 'text' && (
                              <p className="text-gray-700">{String(block.value)}</p>
                            )}
                            {block.type === 'list' && Array.isArray(block.value) && (
                              <ul className="list-disc list-inside space-y-1">
                                {block.value.map((item: string, j: number) => (
                                  <li key={j} className="text-gray-700 text-sm">{item}</li>
                                ))}
                              </ul>
                            )}
                            {block.type === 'table' && block.value && (
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm border-collapse">
                                  {block.value.headers && (
                                    <thead>
                                      <tr className="bg-[#003366] text-white">
                                        {block.value.headers.map((h: string, j: number) => (
                                          <th key={j} className="px-3 py-2 text-left">{h}</th>
                                        ))}
                                      </tr>
                                    </thead>
                                  )}
                                  <tbody>
                                    {block.value.rows?.map((row: string[], j: number) => (
                                      <tr key={j} className={j % 2 === 0 ? 'bg-gray-50' : ''}>
                                        {row.map((cell: string, k: number) => (
                                          <td key={k} className="px-3 py-2 border-b">{cell}</td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="text-xs text-gray-400 mt-4">
                        {currentSlideData.layout} · Slide {currentSlide + 1} of {slides.length}
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Slide navigation */}
            <div className="flex items-center justify-center gap-4 mt-4">
              <Button
                variant="outline" size="icon"
                disabled={currentSlide === 0}
                onClick={() => setCurrentSlide(prev => prev - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="flex gap-1">
                {slides.map((_: any, i: number) => (
                  <button
                    key={i}
                    onClick={() => setCurrentSlide(i)}
                    className={`w-2.5 h-2.5 rounded-full transition-colors ${
                      i === currentSlide ? 'bg-[#003366]' : 'bg-gray-300 hover:bg-gray-400'
                    }`}
                  />
                ))}
              </div>
              <Button
                variant="outline" size="icon"
                disabled={currentSlide === slides.length - 1}
                onClick={() => setCurrentSlide(prev => prev + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Slide thumbnails */}
            <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
              {slides.map((slide: any, i: number) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className={`flex-shrink-0 w-32 h-20 rounded border p-2 text-left transition-colors ${
                    i === currentSlide ? 'border-[#003366] bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <p className="text-[8px] font-bold text-gray-700 truncate">{slide.title}</p>
                  <p className="text-[7px] text-gray-400">{slide.layout}</p>
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

      {/* AI Chat Panel */}
      {chatOpen && (
        <div className="w-96 flex flex-col bg-white border rounded-lg">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-semibold text-gray-900">AI Chat</h3>
            <button onClick={() => setChatOpen(false)}>
              <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatMessages.length === 0 && (
              <div className="text-center text-sm text-gray-400 py-8">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                Ask me to edit slides, add content, or restructure your pitch book.
              </div>
            )}
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                  msg.role === 'user' ? 'bg-[#003366] text-white' : 'bg-gray-100 text-gray-700'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isSending && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg px-3 py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                </div>
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
      )}
    </div>
  );
}
