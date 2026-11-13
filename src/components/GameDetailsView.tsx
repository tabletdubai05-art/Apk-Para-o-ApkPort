import { useState } from 'react';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  FileArchive,
  Heart,
  Info,
  Play,
  PlayCircle,
  RotateCcw,
  X,
  Zap,
} from 'lucide-react';
import { openSystemDownloadManager } from '../services/downloadEngine';
import type { DownloadTask, Jogo, JogoArquivo } from '../types/game';
import {
  buildDownloadTaskId,
  formatBytes,
  formatCategoriesDot,
  formatSpeedMBs,
  parsePhotos,
  parseTutorials,
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
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const gameId = String(jogo.id);
  const categoriesDot = formatCategoriesDot(jogo.categoria);
  const video = parseVideoSource(jogo.video_url);
  const photos = parsePhotos(jogo.fotos_urls);
  const files = resolveGameFiles(jogo);
  const tutorials = parseTutorials(jogo.tutoriais);
  const hasAnyTorrent = files.some((item) => Boolean(item.torrent_url?.trim()));

  const copyToClipboard = async (text: string, key: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    try {
      await navigator.clipboard.writeText(trimmed);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = trimmed;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        setCopiedKey(key);
        setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 2000);
      } finally {
        document.body.removeChild(textarea);
      }
    }
  };

  const openP2PLink = (targetUrl: string) => {
    const trimmed = targetUrl.trim();
    if (!trimmed) return;

    if (/^https:\/\//i.test(trimmed)) {
      const urlWithoutHttps = trimmed.replace(/^https:\/\//i, '');
      const intentUrl = `intent://${urlWithoutHttps}#Intent;scheme=https;type=application/x-bittorrent;package=org.proninyaroslav.libretorrent;end`;
      window.location.href = intentUrl;
      return;
    }

    if (/^http:\/\//i.test(trimmed)) {
      const urlWithoutHttp = trimmed.replace(/^http:\/\//i, '');
      const intentUrl = `intent://${urlWithoutHttp}#Intent;scheme=http;type=application/x-bittorrent;package=org.proninyaroslav.libretorrent;end`;
      window.location.href = intentUrl;
      return;
    }

    window.location.href = trimmed;
  };

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

            {/* Sobre o Port */}
            <div className="rounded-2xl bg-[#0F0E13] border border-[#2A2738] p-4 space-y-2">
              <h2 className="text-sm font-bold text-white">Sobre o Port</h2>
              <p className="text-sm text-[#D1D5DB] leading-relaxed whitespace-pre-line">
                {jogo.descricao || 'Nenhuma descrição informada para este port.'}
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
                    const directUrl = arquivo.url?.trim() || '';
                    const fileTorrentUrl = arquivo.torrent_url?.trim() || '';

                    return (
                      <div
                        key={taskId}
                        className="rounded-2xl bg-[#0F0E13] border border-[#2A2738] p-3.5 space-y-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-[#1B1924] border border-[#2A2738] flex items-center justify-center text-[#8B5CF6] shrink-0">
                            <FileArchive className="w-5 h-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-white truncate">
                              {arquivo.nome}
                            </p>
                            <p className="text-xs text-[#9CA3AF] font-mono-nums">
                              {arquivo.tamanho || jogo.tamanho || 'Tamanho variável'}
                            </p>
                          </div>
                        </div>

                        {/* Side-by-side Download Direto + Baixar P2P + Copiar Link P2P */}
                        <div className="flex flex-wrap items-center gap-2">
                          {directUrl && (!task || task.status === 'cancelled') && (
                            <button
                              type="button"
                              onClick={() => onStartFileDownload(jogo, arquivo, index)}
                              className="flex-1 min-w-[130px] min-h-[44px] px-3.5 rounded-xl bg-[#1B1924] border border-[#2A2738] hover:border-[#6366F1]/50 text-white text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <Download className="w-4 h-4 shrink-0" />
                              <span>Download Direto</span>
                            </button>
                          )}

                          {directUrl && isDownloading && (
                            <button
                              type="button"
                              onClick={() => onCancelDownload(taskId)}
                              className="flex-1 min-w-[130px] min-h-[44px] px-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold inline-flex items-center justify-center"
                            >
                              Cancelar
                            </button>
                          )}

                          {directUrl && isPaused && (
                            <button
                              type="button"
                              onClick={() => onResumeDownload(task)}
                              className="flex-1 min-w-[130px] min-h-[44px] px-3.5 rounded-xl bg-[#1B1924] border border-[#2A2738] hover:border-[#6366F1]/50 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5"
                            >
                              <Play className="w-3.5 h-3.5 shrink-0" />
                              <span>Retomar</span>
                            </button>
                          )}

                          {directUrl && (isError || isCompleted) && (
                            <button
                              type="button"
                              onClick={() => onRetryDownload(task)}
                              className="flex-1 min-w-[130px] min-h-[44px] px-3.5 rounded-xl bg-[#1B1924] border border-[#2A2738] hover:border-[#6366F1]/50 text-white text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                              <span>Download Direto</span>
                            </button>
                          )}

                          {fileTorrentUrl && (
                            <>
                              <button
                                type="button"
                                onClick={() => openP2PLink(fileTorrentUrl)}
                                className="flex-1 min-w-[125px] min-h-[44px] px-3.5 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:from-[#5558E6] hover:to-[#7C4DFF] text-white text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-1.5 shadow-md shadow-[#6366F1]/25 active:scale-[0.98] transition-all"
                              >
                                <Zap className="w-4 h-4 shrink-0" />
                                <span>Baixar P2P</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => copyToClipboard(fileTorrentUrl, taskId)}
                                aria-label={`Copiar link P2P de ${arquivo.nome}`}
                                title="Copiar link P2P"
                                className="min-h-[44px] min-w-[44px] px-3 rounded-xl bg-[#1B1924] border border-[#2A2738] hover:border-[#6366F1]/50 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors shrink-0"
                              >
                                {copiedKey === taskId ? (
                                  <>
                                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                                    <span className="text-emerald-400 hidden sm:inline">
                                      Copiado
                                    </span>
                                  </>
                                ) : (
                                  <Copy className="w-4 h-4 text-[#8B5CF6] shrink-0" />
                                )}
                              </button>
                            </>
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

                        {directUrl && (
                          <div className="flex justify-end pt-0.5">
                            <button
                              type="button"
                              onClick={() => openSystemDownloadManager(directUrl)}
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

              {hasAnyTorrent && (
                <div className="rounded-xl bg-[#0F0E13]/85 border border-[#2A2738] px-3.5 py-2.5 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-[#8B5CF6] shrink-0 mt-0.5" />
                  <p className="text-xs text-[#9CA3AF] leading-relaxed">
                    Dica para velocidade máxima: Para jogos pesados (acima de 2 GB), recomendamos usar o app gratuito LibreTorrent no botão P2P acima. Ele permite pausar o download e baixa em velocidade máxima.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Vídeos Tutoriais */}
        {tutorials.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <PlayCircle className="w-5 h-5 text-[#8B5CF6] shrink-0" />
              <h2 className="text-base font-bold text-white">Vídeos Tutoriais</h2>
            </div>

            <div className="space-y-3">
              {tutorials.map((tutorial, idx) => {
                const parsedTutorialVideo = parseVideoSource(tutorial.url);
                if (!parsedTutorialVideo) return null;

                return (
                  <div
                    key={`${tutorial.url}-${idx}`}
                    className="rounded-2xl bg-[#1B1924] border border-[#2A2738] p-4 space-y-3"
                  >
                    <h3 className="text-sm sm:text-base font-bold text-white leading-snug">
                      {tutorial.titulo}
                    </h3>

                    <div className="rounded-xl overflow-hidden bg-[#0F0E13] border border-[#2A2738] aspect-video">
                      {parsedTutorialVideo.type === 'youtube' ? (
                        <iframe
                          src={parsedTutorialVideo.src}
                          title={tutorial.titulo}
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      ) : (
                        <video
                          src={parsedTutorialVideo.src}
                          controls
                          playsInline
                          preload="metadata"
                          className="w-full h-full object-contain bg-black"
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

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
