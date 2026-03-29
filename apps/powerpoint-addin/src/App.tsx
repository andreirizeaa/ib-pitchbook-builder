import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { Menu, Plus, Layers, LogOut, X, BookOpen, Trash2 } from 'lucide-react';
import { Login } from './components/Login';
import { PitchbookList } from './components/PitchbookList';
import { CreatePitchbook } from './components/CreatePitchbook';
import { GeneratingView } from './components/GeneratingView';
import { AiChat } from './components/AiChat';
import { DeckLayouts } from './components/DeckLayouts';
import { DeckLayoutDetail } from './components/DeckLayoutDetail';
import { apiClient } from './lib/api';
import { deleteAllSlides } from './lib/office-helpers';

type View = 'list' | 'create' | 'generating' | 'chat' | 'layouts' | 'layout-detail';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<View>('list');
  const [pitchBookId, setPitchBookId] = useState<string | null>(null);
  const [pitchBook, setPitchBook] = useState<any>(null);
  const [selectedDeckType, setSelectedDeckType] = useState<any>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleDeletePitchbook = async () => {
    if (!pitchBookId || !session) return;
    setIsDeleting(true);
    try {
      await apiClient<any>(`/api/pitchbooks/${pitchBookId}`, {
        method: 'DELETE',
        token: session.access_token,
      });
      await deleteAllSlides();
      setShowDeleteConfirm(false);
      setPitchBookId(null);
      setPitchBook(null);
      setView('list');
    } catch (err) {
      console.error('Failed to delete pitch book:', err);
    } finally {
      setIsDeleting(false);
    }
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
      <div className="flex items-center justify-between px-3 py-2 bg-white border-b relative">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="inline-flex items-center px-2 py-1.5 text-gray-600 rounded-md hover:bg-gray-100 transition-colors"
          title="Menu"
        >
          {menuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
        <h1 className="text-xs font-bold text-gray-900">AI Pitch Deck</h1>
        <div className="flex items-center gap-1.5">
          {pitchBookId && (view === 'chat' || view === 'generating') && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="inline-flex items-center p-1.5 text-gray-400 rounded-md hover:bg-red-50 hover:text-red-600 transition-colors"
              title="Delete pitch book"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={handleNewPitchbook}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New
          </button>
        </div>

        {/* Dropdown menu */}
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div className="absolute left-3 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border z-20 py-1">
              <button
                onClick={() => { handleBack(); setMenuOpen(false); }}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <BookOpen className="w-3.5 h-3.5 text-gray-400" />
                My Pitch Books
              </button>
              <button
                onClick={() => { setView('layouts'); setMenuOpen(false); }}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Layers className="w-3.5 h-3.5 text-gray-400" />
                Deck Layouts
              </button>
              <div className="border-t my-1" />
              <button
                onClick={() => { supabase.auth.signOut(); setMenuOpen(false); }}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          </>
        )}
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
        {view === 'layouts' && (
          <DeckLayouts
            token={session.access_token}
            onOpenDeck={(dt) => { setSelectedDeckType(dt); setView('layout-detail'); }}
          />
        )}
        {view === 'layout-detail' && selectedDeckType && (
          <DeckLayoutDetail
            token={session.access_token}
            deckType={selectedDeckType}
            onBack={() => { setSelectedDeckType(null); setView('layouts'); }}
          />
        )}
      </div>

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl mx-4 w-full max-w-xs p-4">
            <h3 className="text-sm font-bold text-gray-900 mb-1">Delete Pitch Book?</h3>
            <p className="text-xs text-gray-500 mb-4">
              This will permanently delete this pitch book and all its data. This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 py-2 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePitchbook}
                disabled={isDeleting}
                className="flex-1 py-2 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isDeleting ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
