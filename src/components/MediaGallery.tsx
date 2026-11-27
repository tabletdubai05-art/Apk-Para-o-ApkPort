import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { GalleryMediaItem, GalleryMediaKind } from '../utils/formatters';
import {
  getCachedGalleryAssetSync,
  loadGalleryAssetAsync,
  updateCachedAssetDimensions,
  type CachedGalleryAsset,
} from '../utils/mediaCache';

interface MediaGalleryProps {
  title: string;
  items: GalleryMediaItem[];
  itemTitle: string;
  showCountInTitle?: boolean;
  fullBleedCarousel?: boolean;
}

function LoopVideoElement({
  src,
  ariaLabel,
  className,
  paused = false,
}: {
  src: string;
  ariaLabel: string;
  className: string;
  paused?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (paused) {
      el.pause();
    } else if (el.paused) {
      void el.play().catch(() => {});
    }
  }, [paused, src]);

  return (
    <video
      ref={videoRef}
      key={src}
      src={src}
      aria-label={ariaLabel}
      autoPlay={!paused}
      loop
      muted
      playsInline
      preload="auto"
      disablePictureInPicture
      onLoadedData={(e) => {
        const video = e.currentTarget;
        video.muted = true;
        if (!paused && video.paused) {
          void video.play().catch(() => {});
        }
      }}
      onClick={(e) => e.stopPropagation()}
      className={className}
    />
  );
}

interface CachedGalleryMediaProps {
  rawUrl: string;
  kind: GalleryMediaKind;
  alt: string;
  mode: 'thumbnail' | 'fullscreen';
  paused?: boolean;
  eager?: boolean;
  onStopPropagation?: boolean;
}

/**
 * Componente dedicado de cache assíncrono para GIFs, vídeos em loop e imagens.
 * Evita travamentos na thread principal, pré-decodifica fora da renderização
 * e reutiliza a mesma entrada em cache entre miniaturas e tela cheia.
 */
function CachedGalleryMedia({
  rawUrl,
  kind,
  alt,
  mode,
  paused = false,
  eager = false,
  onStopPropagation = false,
}: CachedGalleryMediaProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState<boolean>(
    eager || mode === 'fullscreen' || Boolean(getCachedGalleryAssetSync(rawUrl))
  );
  const [asset, setAsset] = useState<CachedGalleryAsset | null>(() =>
    getCachedGalleryAssetSync(rawUrl)
  );
  const [mediaVisible, setMediaVisible] = useState<boolean>(() =>
    Boolean(getCachedGalleryAssetSync(rawUrl))
  );

  // Observa visibilidade no viewport para carregamento assíncrono sob demanda
  useEffect(() => {
    if (inView) return;
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '240px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [inView]);

  // Carrega e armazena no cache assincronamente quando entra na janela visível
  useEffect(() => {
    let active = true;
    const syncHit = getCachedGalleryAssetSync(rawUrl);
    if (syncHit) {
      setAsset(syncHit);
      setMediaVisible(true);
      return () => {
        active = false;
      };
    }

    if (!inView) {
      return () => {
        active = false;
      };
    }

    setMediaVisible(false);
    void loadGalleryAssetAsync(rawUrl, kind).then((loaded) => {
      if (!active) return;
      setAsset(loaded);
      setMediaVisible(true);
    });

    return () => {
      active = false;
    };
  }, [inView, kind, rawUrl]);

  const isAnimated = kind === 'gif' || kind === 'video';
  const isLowResGif = Boolean(
    kind === 'gif' &&
      asset?.naturalWidth &&
      asset.naturalWidth > 0 &&
      asset.naturalWidth <= 360
  );

  const objectFitClass =
    mode === 'fullscreen'
      ? 'max-w-full max-h-[85vh] rounded-xl object-contain'
      : isAnimated
      ? 'w-full h-full object-contain'
      : 'w-full h-full object-cover';

  return (
    <div
      ref={containerRef}
      onClick={onStopPropagation ? (e) => e.stopPropagation() : undefined}
      className={
        mode === 'fullscreen'
          ? 'relative flex items-center justify-center max-w-full max-h-[85vh]'
          : 'relative w-full h-full flex items-center justify-center'
      }
    >
      {!asset && (
        <div
          aria-hidden="true"
          className={
            mode === 'fullscreen'
              ? 'w-72 sm:w-96 aspect-video rounded-xl bg-white/10 animate-pulse'
              : 'w-full h-full bg-[#E8EAF2] dark:bg-[#14121B] purple:bg-[#170E2B] animate-pulse'
          }
        />
      )}

      {asset &&
        (kind === 'video' ? (
          <LoopVideoElement
            src={asset.src}
            ariaLabel={alt}
            paused={paused}
            className={`${objectFitClass} transform-gpu transition-opacity duration-200 ${
              mediaVisible ? 'opacity-100' : 'opacity-0'
            } ${mode === 'thumbnail' ? 'pointer-events-none' : ''}`}
          />
        ) : (
          <img
            key={asset.src}
            src={asset.src}
            alt={alt}
            referrerPolicy="no-referrer"
            loading={mode === 'fullscreen' || kind === 'gif' ? 'eager' : 'lazy'}
            decoding={kind === 'gif' ? 'auto' : 'async'}
            onLoad={(e) => {
              const { naturalWidth, naturalHeight } = e.currentTarget;
              if (naturalWidth > 0 && naturalHeight > 0) {
                updateCachedAssetDimensions(rawUrl, naturalWidth, naturalHeight);
                setAsset((prev) =>
                  prev && (!prev.naturalWidth || !prev.naturalHeight)
                    ? { ...prev, naturalWidth, naturalHeight }
                    : prev
                );
              }
              setMediaVisible(true);
            }}
            style={
              isLowResGif ? { imageRendering: 'pixelated' } : undefined
            }
            className={`${objectFitClass} transform-gpu transition-opacity duration-200 ${
              mediaVisible ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ))}
    </div>
  );
}

export function MediaGallery({
  title,
  items,
  itemTitle,
  showCountInTitle = true,
  fullBleedCarousel = false,
}: MediaGalleryProps) {
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);

  // Pré-aquece assincronamente os primeiros itens visíveis do carrossel em segundo plano
  useEffect(() => {
    if (items.length === 0) return;
    let cancelled = false;
    const warmQueue = items.slice(0, 4);

    const timer = setTimeout(() => {
      warmQueue.forEach((item) => {
        if (!cancelled) {
          void loadGalleryAssetAsync(item.url, item.kind);
        }
      });
    }, 60);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [items]);

  // Pré-carrega vizinhos quando o visualizador em tela cheia muda de slide
  useEffect(() => {
    if (fullscreenIndex === null || items.length <= 1) return;
    const prevIdx = (fullscreenIndex - 1 + items.length) % items.length;
    const nextIdx = (fullscreenIndex + 1) % items.length;
    void loadGalleryAssetAsync(items[prevIdx].url, items[prevIdx].kind);
    void loadGalleryAssetAsync(items[nextIdx].url, items[nextIdx].kind);
  }, [fullscreenIndex, items]);

  useEffect(() => {
    if (fullscreenIndex === null || items.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setFullscreenIndex(null);
      } else if (e.key === 'ArrowLeft' && items.length > 1) {
        setFullscreenIndex((prev) =>
          prev === null ? 0 : (prev - 1 + items.length) % items.length
        );
      } else if (e.key === 'ArrowRight' && items.length > 1) {
        setFullscreenIndex((prev) =>
          prev === null ? 0 : (prev + 1) % items.length
        );
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fullscreenIndex, items.length]);

  if (items.length === 0) return null;

  const isLightboxOpen = fullscreenIndex !== null;
  const activeItem =
    fullscreenIndex !== null ? items[fullscreenIndex] ?? null : null;

  return (
    <>
      <section className="space-y-3">
        <h2 className="text-base font-bold text-[#111827] dark:text-white">
          {showCountInTitle ? `${title} (${items.length})` : title}
        </h2>

        <div
          className={`flex gap-3 overflow-x-auto no-scrollbar pb-1 ${
            fullBleedCarousel ? '-mx-4 px-4' : ''
          }`}
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {items.map((item, idx) => {
            const isAnimated = item.kind === 'gif' || item.kind === 'video';
            const altLabel = `${itemTitle} ${
              isAnimated ? 'GIF' : 'screenshot'
            } ${idx + 1}`;

            return (
              <button
                key={`${idx}-${item.kind}`}
                type="button"
                onClick={() => setFullscreenIndex(idx)}
                style={{ contain: 'layout paint' }}
                className={`relative shrink-0 w-64 sm:w-72 aspect-video rounded-2xl overflow-hidden border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] hover:border-[#6366F1]/60 purple:hover:border-[#A855F7]/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366F1] purple:focus-visible:ring-[#A855F7] ${
                  isAnimated
                    ? 'bg-[#09080D]'
                    : 'bg-white dark:bg-[#1B1924] purple:bg-[#20143A]'
                }`}
              >
                <CachedGalleryMedia
                  rawUrl={item.url}
                  kind={item.kind}
                  alt={altLabel}
                  mode="thumbnail"
                  paused={isLightboxOpen}
                  eager={idx < 3}
                />

                {isAnimated && (
                  <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-sm border border-white/15 text-[10px] font-extrabold tracking-wider text-white pointer-events-none">
                    GIF
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {fullscreenIndex !== null && activeItem && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setFullscreenIndex(null)}
        >
          <button
            type="button"
            onClick={() => setFullscreenIndex(null)}
            aria-label="Fechar imagem em tela cheia"
            className="absolute top-4 right-4 z-10 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-[#1B1924]/90 border border-[#2A2738] text-white hover:bg-[#2A2738] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {items.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFullscreenIndex((prev) =>
                    prev === null
                      ? 0
                      : (prev - 1 + items.length) % items.length
                  );
                }}
                aria-label="Foto anterior"
                className="absolute left-3 sm:left-6 z-10 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-[#1B1924]/85 border border-[#2A2738] text-white hover:bg-[#2A2738] transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFullscreenIndex((prev) =>
                    prev === null ? 0 : (prev + 1) % items.length
                  );
                }}
                aria-label="Próxima foto"
                className="absolute right-3 sm:right-6 z-10 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-[#1B1924]/85 border border-[#2A2738] text-white hover:bg-[#2A2738] transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          <CachedGalleryMedia
            rawUrl={activeItem.url}
            kind={activeItem.kind}
            alt={`${itemTitle} ${
              activeItem.kind === 'gif' || activeItem.kind === 'video'
                ? 'GIF'
                : 'imagem'
            } ${fullscreenIndex + 1}`}
            mode="fullscreen"
            eager
            onStopPropagation
          />

          <div className="absolute bottom-5 flex items-center gap-2 px-3 py-1 rounded-lg bg-[#1B1924]/85 border border-[#2A2738] text-xs font-mono-nums text-[#9CA3AF]">
            {(activeItem.kind === 'gif' || activeItem.kind === 'video') && (
              <span className="px-1.5 py-0.5 rounded bg-white/15 text-[10px] font-extrabold tracking-wider text-white">
                GIF
              </span>
            )}
            <span>
              {fullscreenIndex + 1} / {items.length}
            </span>
          </div>
        </div>
      )}
    </>
  );
}
