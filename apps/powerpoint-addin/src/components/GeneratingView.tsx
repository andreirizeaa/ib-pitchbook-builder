import { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiClient } from '../lib/api';
import { fetchPptxAsBase64, insertSlidesFromBase64 } from '../lib/office-helpers';

interface Props {
  token: string;
  pitchBookId: string;
  onComplete: (pitchBook: any) => void;
}

const STEPS = [
  { key: 'analyzing_template', label: 'Analysing template' },
  { key: 'fetching_data', label: 'Fetching company data' },
  { key: 'planning_content', label: 'Planning content with AI' },
  { key: 'building_slides', label: 'Building slides' },
  { key: 'generating_previews', label: 'Generating previews' },
  { key: 'completed', label: 'Done' },
];

export function GeneratingView({ token, pitchBookId, onComplete }: Props) {
  const [generation, setGeneration] = useState<any>(null);
  const [error, setError] = useState('');
  const [insertStatus, setInsertStatus] = useState<'idle' | 'inserting' | 'done' | 'error'>('idle');
  const [pendingPb, setPendingPb] = useState<any>(null);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await apiClient<any>(`/api/pitchbooks/${pitchBookId}/generation`, { token });
        setGeneration(res.data);

        if (res.data.status === 'completed') {
          clearInterval(interval);
          // Fetch the completed pitch book
          const pbRes = await apiClient<any>(`/api/pitchbooks/${pitchBookId}`, { token });
          const pb = pbRes.data;

          // Insert slides into PowerPoint
          if (pb.file_url) {
            setInsertStatus('inserting');
            try {
              const base64 = await fetchPptxAsBase64(pb.file_url);
              await insertSlidesFromBase64(base64);
              setInsertStatus('done');
              // Transition to chat after successful insertion
              setTimeout(() => onComplete(pb), 1200);
            } catch (err: any) {
              console.error('Failed to insert slides:', err);
              setInsertStatus('error');
              // Store pb so user can proceed manually
              setPendingPb(pb);
            }
          } else {
            onComplete(pb);
          }
        } else if (res.data.status === 'failed') {
          clearInterval(interval);
          setError(res.data.error || 'Generation failed');
        }
      } catch {
        // Keep polling
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [pitchBookId, token, onComplete]);

  const currentStep = generation?.status || 'queued';
  const progress = generation?.progress || 0;

  return (
    <div className="flex flex-col items-center justify-center h-full px-4">
      <div className="w-full max-w-sm">
        {error ? (
          <div className="text-center">
            <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
            <h2 className="text-sm font-bold text-gray-900 mb-1">Generation Failed</h2>
            <p className="text-xs text-red-600">{error}</p>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-3" />
              <h2 className="text-sm font-bold text-gray-900">
                {insertStatus === 'inserting' ? 'Inserting Slides...' : 'Generating Pitch Book'}
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                {generation?.current_step || 'Starting...'}
              </p>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-1.5 mb-4">
              <div
                className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Steps */}
            <div className="space-y-2">
              {STEPS.map((step) => {
                const stepIndex = STEPS.findIndex(s => s.key === step.key);
                const currentIndex = STEPS.findIndex(s => s.key === currentStep);
                const isDone = stepIndex < currentIndex || currentStep === 'completed';
                const isCurrent = step.key === currentStep;

                return (
                  <div key={step.key} className="flex items-center gap-2">
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    ) : isCurrent ? (
                      <Loader2 className="w-4 h-4 text-blue-600 animate-spin flex-shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-gray-200 flex-shrink-0" />
                    )}
                    <span className={`text-xs ${isDone ? 'text-green-700' : isCurrent ? 'text-blue-700 font-medium' : 'text-gray-400'}`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {insertStatus === 'done' && (
              <div className="mt-4 bg-green-50 text-green-700 text-xs rounded-lg px-3 py-2 text-center">
                Slides inserted into your presentation!
              </div>
            )}
            {insertStatus === 'error' && (
              <div className="mt-4 space-y-2">
                <div className="bg-yellow-50 text-yellow-700 text-xs rounded-lg px-3 py-2 text-center">
                  Could not insert slides automatically. You can download from the web app.
                </div>
                {pendingPb && (
                  <button
                    onClick={() => onComplete(pendingPb)}
                    className="w-full py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700"
                  >
                    Continue to Chat
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
