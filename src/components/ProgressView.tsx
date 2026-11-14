import { Clock, Download, History, Trash2, Zap } from 'lucide-react';
import { usePreferences } from '../context/PreferencesContext';
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
  const { t } = usePreferences();

  if (tasks.length === 0) {
    return (
      <div className="rounded-2xl bg-white dark:bg-[#1B1924] purple:bg-[#20143A] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] p-8 text-center space-y-2.5">
        <div className="w-12 h-12 rounded-2xl bg-[#6366F1]/12 dark:bg-[#6366F1]/15 purple:bg-[#9333EA]/25 border border-[#6366F1]/30 purple:border-[#A855F7]/40 flex items-center justify-center mx-auto text-[#6366F1] dark:text-[#8B5CF6] purple:text-[#C084FC]">
          <History className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-[#111827] dark:text-white">
          {t.history.emptyTitle}
        </h3>
        <p className="text-sm text-[#525866] dark:text-[#9CA3AF] purple:text-[#C4B5FD] max-w-sm mx-auto">
          {t.history.emptyDescription}
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
            className="rounded-2xl bg-white dark:bg-[#1B1924] purple:bg-[#20143A] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] p-4 space-y-3"
          >
            <div className="flex items-start gap-3.5">
              <div className="w-14 h-14 rounded-xl overflow-hidden bg-[#F0F1F6] dark:bg-[#14121B] purple:bg-[#170E2B] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] shrink-0">
                <GameCover src={task.capa_url} alt={task.titulo} className="w-full h-full" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-[#111827] dark:text-white truncate">
                      {task.titulo}
                    </h3>
                    <p className="text-xs font-semibold text-[#4F46E5] dark:text-[#A5B4FC] purple:text-[#D8B4FE] truncate">
                      {task.arquivoNome || task.fileName}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onRemoveFinished(task.taskId)}
                    aria-label={`Remover ${task.arquivoNome || task.fileName} do histórico`}
                    className="min-w-[36px] min-h-[36px] -mt-1 -mr-1 flex items-center justify-center rounded-lg text-[#525866] dark:text-[#9CA3AF] purple:text-[#C4B5FD] hover:text-[#111827] dark:hover:text-white hover:bg-[#F0F1F6] dark:hover:bg-[#2A2738]/60 purple:hover:bg-[#392466]/60 transition-colors shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-[#525866] dark:text-[#9CA3AF] purple:text-[#C4B5FD] font-mono-nums mt-0.5">
                  {task.versao} • {task.tamanho}
                </p>

                {startedAt && (
                  <p className="inline-flex items-center gap-1.5 text-xs text-[#525866] dark:text-[#9CA3AF] purple:text-[#C4B5FD] font-mono-nums mt-1">
                    <Clock className="w-3.5 h-3.5 text-[#6366F1] dark:text-[#8B5CF6] purple:text-[#C084FC] shrink-0" />
                    <span>{startedAt}</span>
                  </p>
                )}
              </div>
            </div>

            {(directUrl || torrentUrl) && (
              <div className="pt-1 space-y-2">
                <p className="text-[11px] font-medium text-[#525866] dark:text-[#9CA3AF] purple:text-[#C4B5FD]">
                  {t.history.downloadAgain}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {directUrl && (
                    <button
                      type="button"
                      onClick={() => onRetry(task, 'direct')}
                      className="flex-1 min-w-[120px] min-h-[44px] px-3.5 rounded-xl bg-[#F4F5F9] dark:bg-[#0F0E13] purple:bg-[#170E2B] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] hover:border-[#6366F1]/50 purple:hover:border-[#A855F7]/60 text-[#111827] dark:text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Download className="w-4 h-4 shrink-0" />
                      <span>{t.history.direct}</span>
                    </button>
                  )}

                  {torrentUrl && (
                    <button
                      type="button"
                      onClick={() => onRetry(task, 'p2p')}
                      className="flex-1 min-w-[120px] min-h-[44px] px-3.5 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] purple:from-[#7E22CE] purple:to-[#C026D3] hover:from-[#5558E6] hover:to-[#7C4DFF] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 shadow-md shadow-[#6366F1]/25 purple:shadow-[#9333EA]/30 active:scale-[0.98] transition-all"
                    >
                      <Zap className="w-4 h-4 shrink-0" />
                      <span>{t.history.p2p}</span>
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
