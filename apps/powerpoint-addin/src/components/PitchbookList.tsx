import { useState, useEffect } from 'react';
import { Loader2, FileText, ChevronRight, Plus } from 'lucide-react';
import { apiClient } from '../lib/api';
import { fetchPptxAsBase64, replaceSlides } from '../lib/office-helpers';

interface Props {
  token: string;
  onNew: () => void;
  onOpen: (id: string, pb: any) => void;
}

export function PitchbookList({ token, onNew, onOpen }: Props) {
  const [pitchbooks, setPitchbooks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    apiClient<any>('/api/pitchbooks', { token })
      .then(res => setPitchbooks(res.data || []))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [token]);

  const handleOpen = async (pb: any) => {
    const fileUrl = pb.file_url || pb.pptx_url;
    if (!fileUrl) {
      onOpen(pb.id, pb);
      return;
    }

    setLoadingId(pb.id);
    try {
      const base64 = await fetchPptxAsBase64(fileUrl);
      await replaceSlides(base64);
      onOpen(pb.id, pb);
    } catch (err) {
      console.error('Failed to load slides:', err);
      onOpen(pb.id, pb);
    } finally {
      setLoadingId(null);
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
        <h2 className="text-sm font-bold text-gray-900">My Pitch Books</h2>
        <button
          onClick={onNew}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          <Plus className="w-3.5 h-3.5" />
          New
        </button>
      </div>

      {pitchbooks.length === 0 ? (
        <div className="text-center py-8">
          <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-xs text-gray-500 mb-3">No pitch books yet</p>
          <button
            onClick={onNew}
            className="px-4 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700"
          >
            Create your first
          </button>
        </div>
      ) : (
        <div className="space-y-1.5">
          {pitchbooks.map((pb) => (
            <button
              key={pb.id}
              onClick={() => handleOpen(pb)}
              disabled={loadingId === pb.id}
              className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{pb.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-500">{pb.company}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      pb.status === 'completed' ? 'bg-green-100 text-green-700' :
                      pb.status === 'generating' ? 'bg-yellow-100 text-yellow-700' :
                      pb.status === 'failed' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {pb.status}
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-400 mt-0.5 block">
                    {new Date(pb.created_at).toLocaleDateString()}
                  </span>
                </div>
                {loadingId === pb.id ? (
                  <Loader2 className="w-4 h-4 animate-spin text-blue-500 flex-shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500 flex-shrink-0" />
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
