import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { Menu, Plus, LogOut } from 'lucide-react';
import { Login } from './components/Login';
import { PitchbookList } from './components/PitchbookList';
import { CreatePitchbook } from './components/CreatePitchbook';
import { GeneratingView } from './components/GeneratingView';
import { AiChat } from './components/AiChat';

type View = 'list' | 'create' | 'generating' | 'chat';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<View>('list');
  const [pitchBookId, setPitchBookId] = useState<string | null>(null);
  const [pitchBook, setPitchBook] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleCreated = (id: string) => {
    setPitchBookId(id);
    setView('generating');
  };

  const handleGenerationComplete = (pb: any) => {
    setPitchBook(pb);
    setView('chat');
  };

  const handleOpenPitchbook = (id: string, pb: any) => {
    setPitchBookId(id);
    setPitchBook(pb);
    setView('chat');
  };

  const handleNewPitchbook = async () => {
    try {
      // @ts-ignore — Office.js global
      await PowerPoint.run(async (context: any) => {
        const slides = context.presentation.slides;
        slides.load('items');
        await context.sync();
        for (let i = slides.items.length - 1; i >= 0; i--) {
          slides.items[i].delete();
        }
        await context.sync();
      });
    } catch {
      // Ignore if no slides to delete
    }
    setPitchBookId(null);
    setPitchBook(null);
    setView('create');
  };

  const handleBack = () => {
    setPitchBookId(null);
    setPitchBook(null);
    setView('list');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <Login onSuccess={setSession} />;
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-white border-b">
        <div className="flex items-center gap-2">
          <button
            onClick={handleNewPitchbook}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New
          </button>
        </div>
        <h1 className="text-xs font-bold text-gray-900">AI Pitch Deck</h1>
        <div className="flex items-center gap-1">
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-gray-600 rounded-md hover:bg-gray-100 transition-colors"
            title="My Pitch Books"
          >
            <Menu className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => supabase.auth.signOut()}
            className="inline-flex items-center px-2 py-1.5 text-xs text-gray-400 rounded-md hover:bg-gray-100 hover:text-gray-600 transition-colors"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {view === 'list' && (
          <PitchbookList
            token={session.access_token}
            onNew={handleNewPitchbook}
            onOpen={handleOpenPitchbook}
          />
        )}
        {view === 'create' && (
          <CreatePitchbook token={session.access_token} onCreated={handleCreated} />
        )}
        {view === 'generating' && pitchBookId && (
          <GeneratingView
            token={session.access_token}
            pitchBookId={pitchBookId}
            onComplete={handleGenerationComplete}
          />
        )}
        {view === 'chat' && pitchBookId && (
          <AiChat
            token={session.access_token}
            pitchBookId={pitchBookId}
            pitchBook={pitchBook}
          />
        )}
      </div>
    </div>
  );
}
