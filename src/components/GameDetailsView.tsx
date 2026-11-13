import { useState } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Download,
  Heart,
  Play,
  RotateCcw,
  Users,
  X,
} from 'lucide-react';
import type { DownloadTask, Jogo } from '../types/game';
import {
  formatBytes,
  formatCategoriesDot,
  formatSpeedMBs,
  parsePhotos,
  parseVideoSource,
} from '../utils/formatters';
import { GameCover } from './GameCover';

interface GameDetailsViewProps {
  jogo: Jogo;
  isFavorite: boolean;
  downloadTask?: DownloadTask;
  onBack: () => void;
  onToggleFavorite: (id: string) => void;
  onStartDownload: (jogo: Jogo) => void;
  onCancelDownload: (gameId: string) => void;
  onResumeDownload: (task: DownloadTask) => void;
  onSaveCompleted: (task: DownloadTask) => void;
  onGoToProgress: () => void;
}

export function GameDetailsView({
  jogo,
  isFavorite,
  downloadTask,
  onBack,
  onToggleFavorite,
  onStartDownload,
  onCancelDownload,
  onResumeDownload,
  onSaveCompleted,
  onGoToProgress,
}: GameDetailsViewProps) {
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);
  const gameId = String(jogo.id);
  const categoriesDot = formatCategoriesDot(jogo.categoria);
  const video = parseVideoSource(jogo.video_url);
  const photos = parsePhotos(jogo.fotos_urls);

  const isDownloading =
    downloadTask?.status === 'starting' || downloadTask?.status === 'downloading';
  const isPaused = downloadTask?.status === 'paused';
  const isCompleted = downloadTask?.status === 'completed';

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

          <div className="p-5 sm:p-6 -mt-8 relative z-10 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="space-y-1.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight text-balance">
                  {jogo.titulo}
                </h1>
                <p className="text-sm font-medium text-[#8B5CF6]">{categoriesDot}</p>
                <p className="text-sm text-[#9CA3AF] font-mono-nums">
                  {jogo.versao} • {jogo.tamanho}
                </p>
              </div>
            </div>

            {/* Download Action / Live Progress */}
            <div className="pt-1">
              {!downloadTask || downloadTask.status === 'cancelled' ? (
                <button
                  type="button"
                  onClick={() => onStartDownload(jogo)}
                  className="w-full min-h-[52px] px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:from-[#5558E6] hover:to-[#7C4DFF] text-white font-bold text-base flex items-center justify-center gap-2.5 shadow-lg shadow-[#6366F1]/25 active:scale-[0.985] transition-all"
                >
                  <Download className="w-5 h-5" />
                  <span>Baixar APK</span>
                </button>
              ) : (
                <div className="rounded-2xl bg-[#0F0E13] border border-[#2A2738] p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-white">
                      {downloadTask.status === 'starting' && 'Conectando ao enxame P2P...'}
                      {downloadTask.status === 'downloading' &&
                        (downloadTask.mode === 'webtorrent'
                          ? 'Baixando via P2P + WebSeed'
                          : 'Baixando via WebSeed (HTTP Direto)')}
                      {isPaused && 'Download pausado (salvo no IndexedDB)'}
                      {isCompleted && 'Download concluído'}
                      {downloadTask.status === 'error' && 'Erro no download'}
                    </span>
                    <span className="font-mono-nums font-bold text-[#8B5CF6]">
                      {downloadTask.progress.toFixed(1)}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2.5 rounded-full bg-[#1B1924] overflow-hidden border border-[#2A2738]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] transition-all duration-200"
                      style={{ width: `${Math.min(100, Math.max(0, downloadTask.progress))}%` }}
                    />
                  </div>

                  {/* Metrics */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#9CA3AF] font-mono-nums">
                    <span>
                      {formatBytes(downloadTask.downloadedBytes)} /{' '}
                      {downloadTask.totalBytes > 0
                        ? formatBytes(downloadTask.totalBytes)
                        : jogo.tamanho}
                    </span>
                    <div className="flex items-center gap-3">
                      {isDownloading && (
                        <>
                          <span>{formatSpeedMBs(downloadTask.speedBytesPerSec)}</span>
                          <span className="inline-flex items-center gap-1 text-[#A5B4FC]">
                            <Users className="w-3.5 h-3.5" />
                            {downloadTask.peers} peers
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {downloadTask.errorMessage && (
                    <p className="text-xs text-rose-400">{downloadTask.errorMessage}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {isPaused && (
                      <button
                        type="button"
                        onClick={() => onResumeDownload(downloadTask)}
                        className="flex-1 min-h-[44px] px-4 rounded-xl bg-[#6366F1] hover:bg-[#5558E6] text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                      >
                        <Play className="w-4 h-4" />
                        <span>Retomar</span>
                      </button>
                    )}

                    {downloadTask.status === 'error' && (
                      <button
                        type="button"
                        onClick={() => onStartDownload(jogo)}
                        className="flex-1 min-h-[44px] px-4 rounded-xl bg-[#6366F1] hover:bg-[#5558E6] text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>Tentar novamente</span>
                      </button>
                    )}

                    {isCompleted && downloadTask.blobUrl && (
                      <button
                        type="button"
                        onClick={() => onSaveCompleted(downloadTask)}
                        className="flex-1 min-h-[44px] px-4 rounded-xl bg-[#6366F1] hover:bg-[#5558E6] text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        <span>Salvar APK novamente</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={onGoToProgress}
                      className="min-h-[44px] px-4 rounded-xl bg-[#1B1924] border border-[#2A2738] hover:border-[#6366F1]/50 text-white text-sm font-medium transition-colors"
                    >
                      Progresso
                    </button>

                    <button
                      type="button"
                      onClick={() => onCancelDownload(gameId)}
                      className="min-h-[44px] px-4 rounded-xl bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 text-rose-400 text-sm font-medium transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
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
