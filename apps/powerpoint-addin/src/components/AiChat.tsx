import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Sparkles, RefreshCw } from 'lucide-react';
import { apiClient } from '../lib/api';
import { fetchPptxAsBase64, replaceSlides } from '../lib/office-helpers';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface Props {
  token: string;
  pitchBookId: string;
  pitchBook: any;
}

export function AiChat({ token, pitchBookId, pitchBook }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'system',
      content: `Pitch book for ${pitchBook?.company || 'your company'} is ready! ${pitchBook?.slides_data?.length || 0} slides have been inserted. Ask me to make changes — I can edit content, add slides, restructure, or update data.`,
    },
  ]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const msg = input.trim();
    if (!msg || isSending) return;

    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setInput('');
    setIsSending(true);

    try {
      const res = await apiClient<any>(`/api/pitchbooks/${pitchBookId}/chat`, {
        method: 'POST',
        token,
        body: JSON.stringify({ message: msg }),
      });

      setMessages(prev => [...prev, { role: 'assistant', content: res.data.message }]);

      // If the AI made changes, offer to refresh slides
      if (res.data.updated) {
        setMessages(prev => [...prev, {
          role: 'system',
          content: 'Slides have been updated. Click "Refresh Slides" to update your presentation.',
        }]);
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
      }]);
    } finally {
      setIsSending(false);
    }
  };

  const handleRefreshSlides = async () => {
    setIsRefreshing(true);
    try {
      // Re-fetch the pitch book to get the latest file_url
      const res = await apiClient<any>(`/api/pitchbooks/${pitchBookId}`, { token });
      const pb = res.data;
      if (pb.file_url) {
        const base64 = await fetchPptxAsBase64(pb.file_url);
        await replaceSlides(base64);
        setMessages(prev => [...prev, {
          role: 'system',
          content: 'Slides refreshed in your presentation!',
        }]);
      }
    } catch (err: any) {
      setMessages(prev => [...prev, {
        role: 'system',
        content: 'Failed to refresh slides. Try downloading from the web app instead.',
      }]);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Refresh bar */}
      <div className="px-3 py-2 border-b bg-white">
        <button
          onClick={handleRefreshSlides}
          disabled={isRefreshing}
          className="w-full flex items-center justify-center gap-2 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50"
        >
          {isRefreshing ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          Refresh Slides in Presentation
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {messages.map((msg, i) => (
          <div key={i}>
            {msg.role === 'user' ? (
              <div className="flex justify-end">
                <div className="max-w-[85%] bg-blue-600 text-white text-xs rounded-xl rounded-br-sm px-3 py-2">
                  {msg.content}
                </div>
              </div>
            ) : msg.role === 'system' ? (
              <div className="flex justify-center">
                <div className="bg-gray-100 text-gray-600 text-xs rounded-lg px-3 py-2 max-w-[90%] text-center">
                  {msg.content}
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Sparkles className="w-3 h-3 text-blue-600" />
                </div>
                <div className="max-w-[85%] text-xs text-gray-800 leading-relaxed">
                  {msg.content}
                </div>
              </div>
            )}
          </div>
        ))}
        {isSending && (
          <div className="flex gap-2">
            <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Loader2 className="w-3 h-3 text-blue-600 animate-spin" />
            </div>
            <div className="text-xs text-gray-400">Thinking...</div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Ask AI to edit slides..."
            disabled={isSending}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={isSending || !input.trim()}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
