import { Clock, Download, History, Trash2, Zap } from 'lucide-react';
import type { DownloadMethod, DownloadTask } from '../types/game';
import { formatHistoryDateTime } from '../utils/formatters';
import { GameCover } from './GameCover';

interface ProgressViewProps {
  tasks: DownloadTask[];
  onRetry: (task: DownloadTask, method: DownloadMethod) => void;
  onRemoveFinished: (taskId: string) => void;
}

export function ProgressView({
  tasks,
  onRetry,
  onRemoveFinished,
}: ProgressViewProps) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-2xl bg-[#1B1924] border border-[#2A2738] p-8 text-center space-y-2.5">
        <div className="w-12 h-12 rounded-2xl bg-[#6366F1]/15 border border-[#6366F1]/30 flex items-center justify-center mx-auto text-[#8B5CF6]">
          <History className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-white">Nenhum item no histórico</h3>
        <p className="text-sm text-[#9CA3AF] max-w-sm mx-auto">
          Escolha qualquer jogo no catálogo e inicie um download para vê-lo registrado aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => {
        const startedAt = formatHistoryDateTime(task.initiatedAt ?? task.updatedAt);
        const directUrl = task.webseed_url?.trim() || '';
        const torrentUrl = task.torrent_url?.trim() || '';

        return (
          <article
            key={task.taskId}
            className="rounded-2xl bg-[#1B1924] border border-[#2A2738] p-4 space-y-3"
          >
            <div className="flex items-start gap-3.5">
              <div className="w-14 h-14 rounded-xl overflow-hidden bg-[#14121B] border border-[#2A2738] shrink-0">
                <GameCover src={task.capa_url} alt={task.titulo} className="w-full h-full" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-white truncate">
                      {task.titulo}
                    </h3>
                    <p className="text-xs font-semibold text-[#A5B4FC] truncate">
                      {task.arquivoNome || task.fileName}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onRemoveFinished(task.taskId)}
                    aria-label={`Remover ${task.arquivoNome || task.fileName} do histórico`}
                    className="min-w-[36px] min-h-[36px] -mt-1 -mr-1 flex items-center justify-center rounded-lg text-[#9CA3AF] hover:text-white hover:bg-[#2A2738]/60 transition-colors shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-[#9CA3AF] font-mono-nums mt-0.5">
                  {task.versao} • {task.tamanho}
                </p>

                {startedAt && (
                  <p className="inline-flex items-center gap-1.5 text-xs text-[#9CA3AF] font-mono-nums mt-1">
                    <Clock className="w-3.5 h-3.5 text-[#8B5CF6] shrink-0" />
                    <span>{startedAt}</span>
                  </p>
                )}
              </div>
            </div>

            {(directUrl || torrentUrl) && (
              <div className="pt-1 space-y-2">
                <p className="text-[11px] font-medium text-[#9CA3AF]">
                  Baixar novamente
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {directUrl && (
                    <button
                      type="button"
                      onClick={() => onRetry(task, 'direct')}
                      className="flex-1 min-w-[120px] min-h-[44px] px-3.5 rounded-xl bg-[#0F0E13] border border-[#2A2738] hover:border-[#6366F1]/50 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Download className="w-4 h-4 shrink-0" />
                      <span>Direto</span>
                    </button>
                  )}

                  {torrentUrl && (
                    <button
                      type="button"
                      onClick={() => onRetry(task, 'p2p')}
                      className="flex-1 min-w-[120px] min-h-[44px] px-3.5 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:from-[#5558E6] hover:to-[#7C4DFF] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 shadow-md shadow-[#6366F1]/25 active:scale-[0.98] transition-all"
                    >
                      <Zap className="w-4 h-4 shrink-0" />
                      <span>P2P</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
