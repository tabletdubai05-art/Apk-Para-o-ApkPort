import {
  CheckCircle2,
  Download,
  ExternalLink,
  Play,
  RotateCcw,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { openSystemDownloadManager } from '../services/downloadEngine';
import type { DownloadTask } from '../types/game';
import { formatBytes, formatSpeedMBs } from '../utils/formatters';
import { GameCover } from './GameCover';

interface ProgressViewProps {
  tasks: DownloadTask[];
  onCancel: (taskId: string) => void;
  onResume: (task: DownloadTask) => void;
  onRetry: (task: DownloadTask) => void;
  onSaveCompleted: (task: DownloadTask) => void;
  onRemoveFinished: (taskId: string) => void;
}

export function ProgressView({
  tasks,
  onCancel,
  onResume,
  onRetry,
  onSaveCompleted,
  onRemoveFinished,
}: ProgressViewProps) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-2xl bg-[#1B1924] border border-[#2A2738] p-8 text-center space-y-2.5">
        <div className="w-12 h-12 rounded-2xl bg-[#6366F1]/15 border border-[#6366F1]/30 flex items-center justify-center mx-auto text-[#8B5CF6]">
          <Download className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-white">Nenhum download ativo</h3>
        <p className="text-sm text-[#9CA3AF] max-w-sm mx-auto">
          Escolha qualquer jogo no catálogo e toque em Baixar para acompanhar a fila de downloads aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => {
        const isActive = task.status === 'starting' || task.status === 'downloading';
        const isPaused = task.status === 'paused';
        const isCompleted = task.status === 'completed';
        const isError = task.status === 'error';
        const fallbackUrl = task.webseed_url || task.torrent_url;

        return (
          <article
            key={task.taskId}
            className="rounded-2xl bg-[#1B1924] border border-[#2A2738] p-4 space-y-3.5"
          >
            <div className="flex items-center gap-3.5">
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

                  {isCompleted ? (
                    <button
                      type="button"
                      onClick={() => onRemoveFinished(task.taskId)}
                      aria-label={`Remover ${task.arquivoNome} do histórico`}
                      className="min-w-[36px] min-h-[36px] -mt-1 -mr-1 flex items-center justify-center rounded-lg text-[#9CA3AF] hover:text-white hover:bg-[#2A2738]/60 transition-colors shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onCancel(task.taskId)}
                      aria-label={`Cancelar download de ${task.arquivoNome}`}
                      className="min-w-[36px] min-h-[36px] -mt-1 -mr-1 flex items-center justify-center rounded-lg text-rose-400 hover:bg-rose-500/15 transition-colors shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <p className="text-xs text-[#9CA3AF] font-mono-nums mt-0.5">
                  {task.versao} • {task.tamanho}
                </p>

                <p className="text-xs font-medium mt-0.5 text-[#8B5CF6] break-all">
                  {task.status === 'starting' && 'Iniciando download...'}
                  {task.status === 'downloading' &&
                    (task.mode === 'capacitor-native'
                      ? `Download Nativo (${task.fileName})`
                      : task.mode === 'webtorrent'
                      ? 'WebTorrent P2P + WebSeed'
                      : 'WebSeed Direto (HTTP Stream)')}
                  {isPaused && 'Interrompido — pronto para retomar (IndexedDB)'}
                  {isCompleted &&
                    (task.savedPath
                      ? `Salvo em: ${task.savedPath}`
                      : 'Concluído')}
                  {isError && 'Falha no download'}
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-1.5">
              <div className="w-full h-2 rounded-full bg-[#0F0E13] overflow-hidden border border-[#2A2738]">
                <div
                  className={`h-full rounded-full transition-all duration-200 ${
                    isCompleted
                      ? 'bg-emerald-500'
                      : isError
                      ? 'bg-rose-500'
                      : 'bg-gradient-to-r from-[#6366F1] to-[#8B5CF6]'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, task.progress))}%` }}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono-nums text-[#9CA3AF]">
                <span>
                  {formatBytes(task.downloadedBytes)} /{' '}
                  {task.totalBytes > 0 ? formatBytes(task.totalBytes) : task.tamanho}
                </span>

                <div className="flex items-center gap-3">
                  {isActive && (
                    <>
                      <span>{formatSpeedMBs(task.speedBytesPerSec)}</span>
                      {task.mode !== 'capacitor-native' && (
                        <span className="inline-flex items-center gap-1 text-[#A5B4FC]">
                          <Users className="w-3.5 h-3.5" />
                          {task.peers} peers
                        </span>
                      )}
                    </>
                  )}
                  <span className="font-bold text-white">{task.progress.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {isError && task.errorMessage && (
              <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">
                {task.errorMessage}
              </p>
            )}

            {/* Action buttons */}
            <div className="flex flex-col gap-2 pt-0.5">
              {isActive && (
                <button
                  type="button"
                  onClick={() => onCancel(task.taskId)}
                  className="w-full min-h-[44px] rounded-xl bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold transition-colors"
                >
                  Cancelar Download
                </button>
              )}

              {isPaused && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onResume(task)}
                    className="flex-1 min-h-[44px] rounded-xl bg-[#6366F1] hover:bg-[#5558E6] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    <span>Retomar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onCancel(task.taskId)}
                    className="min-h-[44px] px-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold"
                  >
                    Cancelar
                  </button>
                </div>
              )}

              {isError && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onRetry(task)}
                    className="flex-1 min-h-[44px] rounded-xl bg-[#6366F1] hover:bg-[#5558E6] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Tentar novamente</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onCancel(task.taskId)}
                    className="min-h-[44px] px-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold"
                  >
                    Cancelar
                  </button>
                </div>
              )}

              {isCompleted && (
                <div className="w-full flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Concluído</span>
                  </div>
                  <div className="flex-1" />
                  {task.blobUrl && (
                    <button
                      type="button"
                      onClick={() => onSaveCompleted(task)}
                      className="min-h-[44px] px-3.5 rounded-xl bg-[#6366F1] hover:bg-[#5558E6] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span>Salvar arquivo</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onRetry(task)}
                    className="min-h-[44px] px-4 rounded-xl bg-[#2A2738] hover:bg-[#353146] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Baixar novamente</span>
                  </button>
                </div>
              )}

              {fallbackUrl && !isCompleted && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => openSystemDownloadManager(fallbackUrl)}
                    className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#9CA3AF] hover:text-white py-1 px-2 rounded-lg hover:bg-[#0F0E13]/60 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3 shrink-0" />
                    <span>Baixar via Gerenciador do Sistema</span>
                  </button>
                </div>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
