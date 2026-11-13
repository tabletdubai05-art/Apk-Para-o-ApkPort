import { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  FileArchive,
  Heart,
  Play,
  RotateCcw,
  X,
} from 'lucide-react';
import { openSystemDownloadManager } from '../services/downloadEngine';
import type { DownloadTask, Jogo, JogoArquivo } from '../types/game';
import {
  buildDownloadTaskId,
  formatBytes,
  formatCategoriesDot,
  formatSpeedMBs,
  parsePhotos,
  parseVideoSource,
  resolveGameFiles,
} from '../utils/formatters';
import { GameCover } from './GameCover';

interface GameDetailsViewProps {
  jogo: Jogo;
  isFavorite: boolean;
  downloads: Record<string, DownloadTask>;
  onBack: () => void;
  onToggleFavorite: (id: string) => void;
  onStartFileDownload: (jogo: Jogo, arquivo: JogoArquivo, index: number) => void;
  onDownloadAll: (jogo: Jogo, arquivos: JogoArquivo[]) => void;
  onCancelDownload: (taskId: string) => void;
  onResumeDownload: (task: DownloadTask) => void;
  onRetryDownload: (task: DownloadTask) => void;
  onGoToProgress: () => void;
}

export function GameDetailsView({
  jogo,
  isFavorite,
  downloads,
  onBack,
  onToggleFavorite,
  onStartFileDownload,
  onDownloadAll,
  onCancelDownload,
  onResumeDownload,
  onRetryDownload,
  onGoToProgress,
}: GameDetailsViewProps) {
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);
  const gameId = String(jogo.id);
  const categoriesDot = formatCategoriesDot(jogo.categoria);
  const video = parseVideoSource(jogo.video_url);
  const photos = parsePhotos(jogo.fotos_urls);
  const files = resolveGameFiles(jogo);

  return (
    <div className="min-h-screen bg-[#0F0E13] text-white pb-28">
      {/* Top sticky header */}
      <header className="sticky top-0 z-30 bg-[#0F0E13]/85 backdrop-blur-md border-b border-[#2A2738]">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="min-h-[44px] min-w-[44px] -ml-2 px-2 inline-flex items-center gap-2 rounded-xl text-white hover:bg-[#1B1924] transition-colors"
            aria-label="Voltar ao catálogo"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium whitespace-nowrap">Voltar</span>
          </button>

          <h2 className="text-sm font-semibold text-[#9CA3AF] truncate">
            {jogo.titulo}
          </h2>

          <button
            type="button"
            onClick={() => onToggleFavorite(gameId)}
            aria-label={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-[#1B1924] border border-[#2A2738] hover:border-[#6366F1]/50 transition-colors"
          >
            <Heart
              className={`w-5 h-5 ${
                isFavorite ? 'fill-rose-500 text-rose-500' : 'text-white/85'
              }`}
            />
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 pt-4 space-y-6">
        {/* Hero Cover & Core Info */}
        <section className="rounded-3xl overflow-hidden bg-[#1B1924] border border-[#2A2738]">
          <div className="relative h-56 sm:h-72 w-full bg-[#14121B]">
            <GameCover src={jogo.capa_url} alt={jogo.titulo} className="w-full h-full" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1B1924] via-[#1B1924]/45 to-transparent" />
            {jogo.destaque && (
              <span className="absolute top-4 left-4 inline-flex items-center px-2.5 py-1 rounded-md bg-amber-400 text-[#0F0E13] text-xs font-bold tracking-wide">
                ★ DESTAQUE
              </span>
            )}
          </div>

          <div className="p-5 sm:p-6 -mt-8 relative z-10 space-y-5">
            <div className="space-y-1.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight text-balance">
                {jogo.titulo}
              </h1>
              <p className="text-sm font-medium text-[#8B5CF6]">{categoriesDot}</p>
              <p className="text-sm text-[#9CA3AF] font-mono-nums">
                {jogo.versao} • {jogo.tamanho}
              </p>
            </div>

            {/* Arquivos Disponíveis */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-bold text-white">
                  Arquivos Disponíveis ({files.length})
                </h2>

                {files.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onDownloadAll(jogo, files)}
                    className="min-h-[44px] px-4 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:from-[#5558E6] hover:to-[#7C4DFF] text-white text-xs sm:text-sm font-bold inline-flex items-center gap-2 shadow-md shadow-[#6366F1]/25 active:scale-[0.98] transition-all shrink-0"
                  >
                    <Download className="w-4 h-4" />
                    <span>Baixar Todos</span>
                  </button>
                )}
              </div>

              {files.length === 0 ? (
                <div className="rounded-2xl bg-[#0F0E13] border border-[#2A2738] p-4 text-xs text-[#9CA3AF]">
                  Nenhum arquivo disponível para download neste port.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {files.map((arquivo, index) => {
                    const taskId = buildDownloadTaskId(gameId, arquivo, index);
                    const task = downloads[taskId];
                    const isDownloading =
                      task?.status === 'starting' || task?.status === 'downloading';
                    const isPaused = task?.status === 'paused';
                    const isCompleted = task?.status === 'completed';
                    const isError = task?.status === 'error';

                    return (
                      <div
                        key={taskId}
                        className="rounded-2xl bg-[#0F0E13] border border-[#2A2738] p-3.5 space-y-2.5"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-[#1B1924] border border-[#2A2738] flex items-center justify-center text-[#8B5CF6] shrink-0">
                              <FileArchive className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-white truncate">
                                {arquivo.nome}
                              </p>
                              <p className="text-xs text-[#9CA3AF] font-mono-nums">
                                {arquivo.tamanho || jogo.tamanho || 'Tamanho variável'}
                              </p>
                            </div>
                          </div>

                          {(!task || task.status === 'cancelled') && (
                            <button
                              type="button"
                              onClick={() => onStartFileDownload(jogo, arquivo, index)}
                              className="min-h-[44px] px-4 rounded-xl bg-[#6366F1] hover:bg-[#5558E6] text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 shrink-0 transition-colors"
                            >
                              <Download className="w-4 h-4" />
                              <span>Baixar</span>
                            </button>
                          )}

                          {isDownloading && (
                            <button
                              type="button"
                              onClick={() => onCancelDownload(taskId)}
                              className="min-h-[44px] px-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold shrink-0"
                            >
                              Cancelar
                            </button>
                          )}

                          {isPaused && (
                            <button
                              type="button"
                              onClick={() => onResumeDownload(task)}
                              className="min-h-[44px] px-3.5 rounded-xl bg-[#6366F1] text-white text-xs font-semibold inline-flex items-center gap-1.5 shrink-0"
                            >
                              <Play className="w-3.5 h-3.5" />
                              <span>Retomar</span>
                            </button>
                          )}

                          {isError && (
                            <button
                              type="button"
                              onClick={() => onRetryDownload(task)}
                              className="min-h-[44px] px-3.5 rounded-xl bg-[#6366F1] text-white text-xs font-semibold inline-flex items-center gap-1.5 shrink-0"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Tentar novamente</span>
                            </button>
                          )}

                          {isCompleted && (
                            <button
                              type="button"
                              onClick={() => onRetryDownload(task)}
                              className="min-h-[44px] px-3.5 rounded-xl bg-[#1B1924] border border-[#2A2738] hover:border-[#6366F1]/50 text-white text-xs font-semibold inline-flex items-center gap-1.5 shrink-0"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Baixar novamente</span>
                            </button>
                          )}
                        </div>

                        {task && task.status !== 'cancelled' && (
                          <div className="space-y-1.5 pt-1 border-t border-[#2A2738]/70">
                            <div className="w-full h-1.5 rounded-full bg-[#1B1924] overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-200 ${
                                  isCompleted
                                    ? 'bg-emerald-500'
                                    : isError
                                    ? 'bg-rose-500'
                                    : 'bg-gradient-to-r from-[#6366F1] to-[#8B5CF6]'
                                }`}
                                style={{
                                  width: `${Math.min(100, Math.max(0, task.progress))}%`,
                                }}
                              />
                            </div>
                            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono-nums text-[#9CA3AF]">
                              <span className="inline-flex items-center gap-1.5 truncate max-w-[70%]">
                                {isCompleted && (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                )}
                                <span className="truncate">
                                  {task.mode === 'system-browser' || isCompleted
                                    ? 'Enviado para o Gerenciador de Downloads do Android'
                                    : isError
                                    ? task.errorMessage || 'Erro no download'
                                    : `${formatBytes(task.downloadedBytes)} / ${
                                        task.totalBytes > 0
                                          ? formatBytes(task.totalBytes)
                                          : arquivo.tamanho || jogo.tamanho
                                      }${
                                        isDownloading
                                          ? ` • ${formatSpeedMBs(task.speedBytesPerSec)}`
                                          : ''
                                      }`}
                                </span>
                              </span>

                              <button
                                type="button"
                                onClick={onGoToProgress}
                                className="text-[#8B5CF6] font-semibold hover:underline shrink-0"
                              >
                                {task.progress.toFixed(1)}% • Ver fila
                              </button>
                            </div>
                          </div>
                        )}

                        {(arquivo.url || arquivo.torrent_url) && (
                          <div className="flex justify-end pt-0.5">
                            <button
                              type="button"
                              onClick={() =>
                                openSystemDownloadManager(
                                  arquivo.url || arquivo.torrent_url
                                )
                              }
                              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#9CA3AF] hover:text-white py-1 px-2 rounded-lg hover:bg-[#1B1924] transition-colors"
                            >
                              <ExternalLink className="w-3 h-3 shrink-0" />
                              <span>Baixar via Gerenciador do Sistema</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Description */}
        <section className="rounded-2xl bg-[#1B1924] border border-[#2A2738] p-5 space-y-2.5">
          <h2 className="text-base font-bold text-white">Sobre o Port</h2>
          <p className="text-sm text-[#D1D5DB] leading-relaxed whitespace-pre-line">
            {jogo.descricao || 'Nenhuma descrição informada para este port.'}
          </p>
        </section>

        {/* Video Player */}
        {video && (
          <section className="space-y-3">
            <h2 className="text-base font-bold text-white">Vídeo</h2>
            <div className="rounded-2xl overflow-hidden bg-[#1B1924] border border-[#2A2738] aspect-video">
              {video.type === 'youtube' ? (
                <iframe
                  src={video.src}
                  title={`Vídeo de ${jogo.titulo}`}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video
                  src={video.src}
                  controls
                  playsInline
                  preload="metadata"
                  className="w-full h-full object-contain bg-black"
                />
              )}
            </div>
          </section>
        )}

        {/* Screenshots Gallery */}
        {photos.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-base font-bold text-white">
              Galeria de Fotos ({photos.length})
            </h2>
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4">
              {photos.map((photoUrl, idx) => (
                <button
                  key={`${photoUrl}-${idx}`}
                  type="button"
                  onClick={() => setFullscreenIndex(idx)}
                  className="shrink-0 w-64 sm:w-72 aspect-video rounded-2xl overflow-hidden bg-[#1B1924] border border-[#2A2738] hover:border-[#6366F1]/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366F1]"
                >
                  <img
                    src={photoUrl}
                    alt={`${jogo.titulo} screenshot ${idx + 1}`}
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Fullscreen Photo Lightbox */}
      {fullscreenIndex !== null && photos[fullscreenIndex] && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setFullscreenIndex(null)}
        >
          <button
            type="button"
            onClick={() => setFullscreenIndex(null)}
            aria-label="Fechar imagem em tela cheia"
            className="absolute top-4 right-4 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-[#1B1924]/90 border border-[#2A2738] text-white"
          >
            <X className="w-5 h-5" />
          </button>

          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFullscreenIndex((prev) =>
                    prev === null ? 0 : (prev - 1 + photos.length) % photos.length
                  );
                }}
                aria-label="Foto anterior"
                className="absolute left-3 sm:left-6 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-[#1B1924]/85 border border-[#2A2738] text-white"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFullscreenIndex((prev) =>
                    prev === null ? 0 : (prev + 1) % photos.length
                  );
                }}
                aria-label="Próxima foto"
                className="absolute right-3 sm:right-6 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-[#1B1924]/85 border border-[#2A2738] text-white"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          <img
            src={photos[fullscreenIndex]}
            alt={`${jogo.titulo} imagem ${fullscreenIndex + 1}`}
            referrerPolicy="no-referrer"
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-[85vh] rounded-xl object-contain"
          />

          <div className="absolute bottom-5 px-3 py-1 rounded-lg bg-[#1B1924]/85 border border-[#2A2738] text-xs font-mono-nums text-[#9CA3AF]">
            {fullscreenIndex + 1} / {photos.length}
          </div>
        </div>
      )}
    </div>
  );
}
