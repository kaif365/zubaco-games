import { Settings, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import GameEditor from '@/features/game/components/GameEditor';

export function GameEditorPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0f172a] text-white p-6">
      <header className="max-w-4xl mx-auto flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              void navigate('/');
            }}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Settings className="h-6 w-6 text-sky-400" />
            Puzzle Editor
          </h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
        <GameEditor />
      </main>
    </div>
  );
}
