import { useState } from 'react';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Copy,
  Download,
  FileArchive,
  Heart,
  Info,
  PlayCircle,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { usePreferences } from '../context/PreferencesContext';
import { copyTextToClipboard } from '../services/downloadEngine';
import type { DownloadTask, Jogo, JogoArquivo } from '../types/game';
import {
  buildDownloadTaskId,
  buildP2PDownloadTaskId,
  formatCategoriesDot,
  parseGalleryMedia,
  parseTutorials,
  parseVideoSource,
  resolveGameFiles,
} from '../utils/formatters';
import {
  sanitizeDirectDownloadUrl,
  sanitizeP2PTorrentUrl,
} from '../utils/urlSecurity';
import { DeviceCompatibilitySection } from './DeviceCompatibilitySection';
import { GameCover } from './GameCover';
import { MediaGallery } from './MediaGallery';

interface GameDetailsViewProps {
  jogo: Jogo;
  isFavorite: boolean;
  downloads: Record<string, DownloadTask>;
  autoOpenReportModal?: boolean;
  onConsumeAutoOpenReport?: () => void;
  onBack: () => void;
  onToggleFavorite: (id: string) => void;
  onStartFileDownload: (jogo: Jogo, arquivo: JogoArquivo, index: number) => void;
  onStartP2PDownload: (jogo: Jogo, arquivo: JogoArquivo, index: number) => void;
  onDownloadAll: (jogo: Jogo, arquivos: JogoArquivo[]) => void;
  onRetryDownload: (task: DownloadTask) => void;
}

export function GameDetailsView({
  jogo,
  isFavorite,
  downloads,
  autoOpenReportModal = false,
  onConsumeAutoOpenReport,
  onBack,
  onToggleFavorite,
  onStartFileDownload,
  onStartP2PDownload,
  onDownloadAll,
  onRetryDownload,
}: GameDetailsViewProps) {
  const { t } = usePreferences();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const gameId = String(jogo.id);
  const categoriesDot = formatCategoriesDot(jogo.categoria);
  const video = parseVideoSource(jogo.video_url);
  const galleryMedia = parseGalleryMedia(jogo.fotos_urls);
  const files = resolveGameFiles(jogo);
  const tutorials = parseTutorials(jogo.tutoriais);
  const hasAnyTorrent = files.some((item) => Boolean(item.torrent_url?.trim()));

  const copyToClipboard = async (text: string, key: string) => {
    const ok = await copyTextToClipboard(text);
    if (!ok) return;
    setCopiedKey(key);
    setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 2000);
  };

  return (
    <div className="min-h-screen bg-[#F4F5F9] dark:bg-[#0F0E13] purple:bg-[#140C24] text-[#111827] dark:text-white pb-28">
      {/* Top sticky header */}
      <header className="sticky top-0 z-30 bg-white/85 dark:bg-[#0F0E13]/85 purple:bg-[#140C24]/85 backdrop-blur-md border-b border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] pt-safe">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="min-h-[44px] min-w-[44px] -ml-2 px-2 inline-flex items-center gap-2 rounded-xl text-[#111827] dark:text-white hover:bg-[#F4F5F9] dark:hover:bg-[#1B1924] purple:hover:bg-[#20143A] transition-colors"
            aria-label={t.details.back}
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium whitespace-nowrap">
              {t.details.back}
            </span>
          </button>

          <h2 className="text-sm font-semibold text-[#525866] dark:text-[#9CA3AF] purple:text-[#C4B5FD] truncate">
            {jogo.titulo}
          </h2>

          <button
            type="button"
            onClick={() => onToggleFavorite(gameId)}
            aria-label={
              isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'
            }
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-[#F4F5F9] dark:bg-[#1B1924] purple:bg-[#20143A] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] hover:border-[#6366F1]/50 purple:hover:border-[#A855F7]/60 transition-colors"
          >
            <Heart
              className={`w-5 h-5 ${
                isFavorite
                  ? 'fill-rose-500 text-rose-500'
                  : 'text-[#525866] dark:text-white/85 purple:text-[#DDD6FE]'
              }`}
            />
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 pt-4 space-y-6">
        {/* Hero Cover & Core Info */}
        <section className="rounded-3xl overflow-hidden bg-white dark:bg-[#1B1924] purple:bg-[#20143A] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466]">
          <div className="relative h-56 sm:h-72 w-full bg-[#E8EAF2] dark:bg-[#14121B] purple:bg-[#170E2B]">
            <GameCover src={jogo.capa_url} alt={jogo.titulo} className="w-full h-full" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent pointer-events-none" />
            {jogo.destaque && (
              <span className="absolute top-4 left-4 inline-flex items-center px-2.5 py-1 rounded-md bg-amber-400 text-[#0F0E13] text-xs font-bold tracking-wide">
                {t.catalog.featuredBadge}
              </span>
            )}
          </div>

          <div className="p-5 sm:p-6 -mt-6 rounded-t-3xl bg-white dark:bg-[#1B1924] purple:bg-[#20143A] relative z-10 space-y-5">
            <div className="space-y-1.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111827] dark:text-white tracking-tight text-balance">
                {jogo.titulo}
              </h1>
              <p className="text-sm font-medium text-[#6366F1] dark:text-[#8B5CF6] purple:text-[#C084FC]">
                {categoriesDot}
              </p>
              <p className="text-sm text-[#525866] dark:text-[#9CA3AF] purple:text-[#C4B5FD] font-mono-nums">
                {jogo.versao} • {jogo.tamanho}
              </p>
            </div>

            {/* Sobre o Port */}
            <div className="rounded-2xl bg-[#F4F5F9] dark:bg-[#0F0E13] purple:bg-[#170E2B] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] p-4 space-y-2">
              <h2 className="text-sm font-bold text-[#111827] dark:text-white">
                {t.details.aboutPort}
              </h2>
              <p className="text-sm text-[#374151] dark:text-[#D1D5DB] purple:text-[#DDD6FE] leading-relaxed whitespace-pre-line">
                {jogo.descricao || t.details.noDescription}
              </p>
            </div>

            {/* Arquivos Disponíveis */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-bold text-[#111827] dark:text-white">
                  {t.details.availableFiles} ({files.length})
                </h2>

                {files.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onDownloadAll(jogo, files)}
                    className="min-h-[44px] px-4 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:from-[#5558E6] hover:to-[#7C4DFF] purple:from-[#7E22CE] purple:to-[#C026D3] purple:hover:from-[#6B21A8] purple:hover:to-[#A21CAF] text-white text-xs sm:text-sm font-bold inline-flex items-center gap-2 shadow-md shadow-[#6366F1]/25 purple:shadow-[#9333EA]/30 active:scale-[0.98] transition-all shrink-0"
                  >
                    <Download className="w-4 h-4" />
                    <span>{t.details.downloadAll}</span>
                  </button>
                )}
              </div>

              {files.length === 0 ? (
                <div className="rounded-2xl bg-[#F4F5F9] dark:bg-[#0F0E13] purple:bg-[#170E2B] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] p-4 text-xs text-[#525866] dark:text-[#9CA3AF] purple:text-[#C4B5FD]">
                  {t.details.noFiles}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {files.map((arquivo, index) => {
                    const taskId = buildDownloadTaskId(gameId, arquivo, index);
                    const p2pTaskId = buildP2PDownloadTaskId(gameId, arquivo, index);
                    const directTask = downloads[taskId];
                    const p2pTask = downloads[p2pTaskId];
                    const isDirectRedirected = Boolean(
                      directTask &&
                        directTask.status !== 'cancelled' &&
                        directTask.status !== 'error'
                    );
                    const isP2PRedirected = Boolean(
                      p2pTask &&
                        p2pTask.status !== 'cancelled' &&
                        p2pTask.status !== 'error'
                    );
                    const isAnyRedirected = isDirectRedirected || isP2PRedirected;
                    const isDirectError = directTask?.status === 'error';
                    const directUrl = sanitizeDirectDownloadUrl(arquivo.url) || '';
                    const fileTorrentUrl = sanitizeP2PTorrentUrl(arquivo.torrent_url) || '';

                    return (
                      <div
                        key={taskId}
                        className="rounded-2xl bg-[#F4F5F9] dark:bg-[#0F0E13] purple:bg-[#170E2B] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] p-3.5 space-y-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#1B1924] purple:bg-[#20143A] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] flex items-center justify-center text-[#6366F1] dark:text-[#8B5CF6] purple:text-[#C084FC] shrink-0">
                            <FileArchive className="w-5 h-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-[#111827] dark:text-white truncate">
                              {arquivo.nome}
                            </p>
                            <p className="text-xs text-[#525866] dark:text-[#9CA3AF] purple:text-[#C4B5FD] font-mono-nums">
                              {arquivo.tamanho || jogo.tamanho || 'Tamanho variável'}
                            </p>
                          </div>
                        </div>

                        {/* Side-by-side Download Direto + Baixar P2P */}
                        <div className="flex flex-wrap items-center gap-2">
                          {directUrl && (
                            <button
                              type="button"
                              onClick={() =>
                                isDirectRedirected && directTask
                                  ? onRetryDownload(directTask)
                                  : onStartFileDownload(jogo, arquivo, index)
                              }
                              className="flex-1 min-w-[130px] min-h-[44px] px-3.5 rounded-xl bg-white dark:bg-[#1B1924] purple:bg-[#20143A] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] hover:border-[#6366F1]/50 purple:hover:border-[#A855F7]/60 text-[#111827] dark:text-white text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-1.5 transition-colors"
                            >
                              {isDirectRedirected ? (
                                <>
                                  <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                                  <span>{t.details.downloadAgain}</span>
                                </>
                              ) : (
                                <>
                                  <Download className="w-4 h-4 shrink-0" />
                                  <span>{t.details.downloadDirect}</span>
                                </>
                              )}
                            </button>
                          )}

                          {fileTorrentUrl && (
                            <button
                              type="button"
                              onClick={() =>
                                isP2PRedirected && p2pTask
                                  ? onRetryDownload(p2pTask)
                                  : onStartP2PDownload(jogo, arquivo, index)
                              }
                              className="flex-1 min-w-[125px] min-h-[44px] px-3.5 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:from-[#5558E6] hover:to-[#7C4DFF] purple:from-[#7E22CE] purple:to-[#C026D3] purple:hover:from-[#6B21A8] purple:hover:to-[#A21CAF] text-white text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-1.5 shadow-md shadow-[#6366F1]/25 purple:shadow-[#9333EA]/30 active:scale-[0.98] transition-all"
                            >
                              {isP2PRedirected ? (
                                <>
                                  <RotateCcw className="w-4 h-4 shrink-0" />
                                  <span>{t.details.downloadAgain}</span>
                                </>
                              ) : (
                                <>
                                  <Zap className="w-4 h-4 shrink-0" />
                                  <span>{t.details.downloadP2P}</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>

                        {fileTorrentUrl && (
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                            <p className="text-[11px] text-[#525866] dark:text-[#9CA3AF] purple:text-[#C4B5FD] leading-snug">
                              {t.details.copyMagnetHint}
                            </p>
                            <button
                              type="button"
                              onClick={() => void copyToClipboard(fileTorrentUrl, taskId)}
                              className="min-h-[32px] px-2.5 py-1 rounded-lg bg-white/80 dark:bg-[#1B1924]/90 purple:bg-[#20143A] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] hover:border-[#6366F1]/50 purple:hover:border-[#A855F7]/60 text-[11px] font-semibold text-[#525866] dark:text-[#D1D5DB] purple:text-[#DDD6FE] hover:text-[#111827] dark:hover:text-white inline-flex items-center gap-1.5 transition-colors shrink-0"
                            >
                              {copiedKey === taskId ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                  <span className="text-emerald-600 dark:text-emerald-400">
                                    {t.details.copied}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5 text-[#6366F1] dark:text-[#8B5CF6] purple:text-[#C084FC] shrink-0" />
                                  <span>{t.details.copyMagnet}</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}

                        {isAnyRedirected && (
                          <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400/90 pt-0.5">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>{t.details.redirectedNotice}</span>
                          </div>
                        )}

                        {!isAnyRedirected && isDirectError && directTask?.errorMessage && (
                          <p className="text-xs text-rose-500 dark:text-rose-400 pt-0.5">
                            {directTask.errorMessage}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {hasAnyTorrent && (
                <div className="rounded-xl bg-[#F4F5F9] dark:bg-[#0F0E13]/85 purple:bg-[#170E2B] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] px-3.5 py-2.5 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-[#6366F1] dark:text-[#8B5CF6] purple:text-[#C084FC] shrink-0 mt-0.5" />
                  <p className="text-xs text-[#525866] dark:text-[#9CA3AF] purple:text-[#C4B5FD] leading-relaxed">
                    {t.details.maxSpeedTipTitle} {t.details.maxSpeedTipBody}
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
              <PlayCircle className="w-5 h-5 text-[#6366F1] dark:text-[#8B5CF6] purple:text-[#C084FC] shrink-0" />
              <h2 className="text-base font-bold text-[#111827] dark:text-white">
                {t.details.tutorialVideos}
              </h2>
            </div>

            <div className="space-y-3">
              {tutorials.map((tutorial, idx) => {
                const parsedTutorialVideo = parseVideoSource(tutorial.url);
                if (!parsedTutorialVideo) return null;

                return (
                  <div
                    key={`${tutorial.url}-${idx}`}
                    className="rounded-2xl bg-white dark:bg-[#1B1924] purple:bg-[#20143A] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] p-4 space-y-3"
                  >
                    <h3 className="text-sm sm:text-base font-bold text-[#111827] dark:text-white leading-snug">
                      {tutorial.titulo}
                    </h3>

                    <div className="rounded-xl overflow-hidden bg-black border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] aspect-video">
                      {parsedTutorialVideo.type === 'youtube' ? (
                        <iframe
                          src={parsedTutorialVideo.src}
                          title={tutorial.titulo}
                          className="w-full h-full"
                          sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
                          referrerPolicy="strict-origin-when-cross-origin"
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
            <h2 className="text-base font-bold text-[#111827] dark:text-white">
              {t.details.video}
            </h2>
            <div className="rounded-2xl overflow-hidden bg-black border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] aspect-video">
              {video.type === 'youtube' ? (
                <iframe
                  src={video.src}
                  title={`Vídeo de ${jogo.titulo}`}
                  className="w-full h-full"
                  sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
                  referrerPolicy="strict-origin-when-cross-origin"
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

        {/* Screenshots & GIFs Gallery */}
        <MediaGallery
          title={t.details.photoGallery}
          items={galleryMedia}
          itemTitle={jogo.titulo}
          showCountInTitle
          fullBleedCarousel
        />

        {/* Comunidade: Roda no seu celular? */}
        <DeviceCompatibilitySection
          jogoId={gameId}
          jogoTitulo={jogo.titulo}
          autoOpenReportModal={autoOpenReportModal}
          onConsumeAutoOpen={onConsumeAutoOpenReport}
        />
      </main>
    </div>
  );
}
