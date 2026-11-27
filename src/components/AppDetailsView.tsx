import {
  ArrowLeft,
  Download,
  ExternalLink,
  Globe,
  Smartphone,
} from 'lucide-react';
import { usePreferences } from '../context/PreferencesContext';
import type { AppItem } from '../types/game';
import { parseCategories, parseGalleryMedia } from '../utils/formatters';
import { detectAppLinkType, openAppLinkExternally } from './AppCard';
import { GameCover } from './GameCover';
import { MediaGallery } from './MediaGallery';

interface AppDetailsViewProps {
  app: AppItem;
  onBack: () => void;
}

export function AppDetailsView({ app, onBack }: AppDetailsViewProps) {
  const { t } = usePreferences();

  const linkType = detectAppLinkType(app);
  const galleryMedia = parseGalleryMedia(app.fotos_urls);
  const cats = parseCategories(app.categoria);
  const metaParts: string[] = [];
  if (cats.length > 0) metaParts.push(cats.join(' • '));
  if (app.versao?.trim()) metaParts.push(app.versao.trim());
  if (app.tamanho?.trim()) metaParts.push(app.tamanho.trim());

  const primaryActionLabel =
    linkType === 'playstore'
      ? t.apps.openPlayStore
      : linkType === 'site'
      ? t.apps.openSite
      : t.apps.downloadApp;

  const PrimaryIcon =
    linkType === 'download'
      ? Download
      : linkType === 'site'
      ? Globe
      : ExternalLink;

  const secondaryUrl = app.link_secundario_url?.trim();
  const secondaryLabel =
    app.link_secundario_label?.trim() || t.apps.secondaryLinkDefault;

  return (
    <div className="min-h-screen bg-[#F4F5F9] dark:bg-[#0F0E13] purple:bg-[#140C24] text-[#111827] dark:text-white pb-24">
      <header className="sticky top-0 z-30 bg-[#F4F5F9]/90 dark:bg-[#0F0E13]/90 purple:bg-[#140C24]/90 backdrop-blur-md border-b border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] pt-safe">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            aria-label={t.details.back}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-white dark:bg-[#1B1924] purple:bg-[#20143A] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] text-[#111827] dark:text-white hover:border-[#6366F1]/50 purple:hover:border-[#A855F7]/60 transition-colors shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base sm:text-lg font-bold text-[#111827] dark:text-white truncate">
            {app.nome}
          </h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Hero */}
        <section className="rounded-2xl bg-white dark:bg-[#1B1924] purple:bg-[#20143A] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] p-4 sm:p-5 space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-[#F0F1F6] dark:bg-[#14121B] purple:bg-[#170E2B] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] shrink-0">
              {app.icone_url?.trim() ? (
                <GameCover
                  src={app.icone_url.trim()}
                  alt={app.nome}
                  className="w-full h-full"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#6366F1]/75 purple:text-[#C084FC]/85">
                  <Smartphone className="w-9 h-9" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 space-y-1.5">
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#111827] dark:text-white leading-tight">
                {app.nome}
              </h2>
              {metaParts.length > 0 && (
                <p className="text-xs sm:text-sm text-[#525866] dark:text-[#9CA3AF] purple:text-[#C4B5FD] font-mono-nums">
                  {metaParts.join(' • ')}
                </p>
              )}
              <p className="text-xs font-medium text-[#6366F1] dark:text-[#8B5CF6] purple:text-[#C084FC]">
                {linkType === 'playstore'
                  ? t.apps.linkTypePlayStore
                  : linkType === 'site'
                  ? t.apps.linkTypeSite
                  : t.apps.linkTypeDownload}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => void openAppLinkExternally(app.link_url, linkType)}
              className="flex-1 min-h-[48px] px-5 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] purple:from-[#7E22CE] purple:to-[#C026D3] hover:from-[#5558E6] hover:to-[#7C4DFF] text-white text-sm font-bold inline-flex items-center justify-center gap-2 shadow-lg shadow-[#6366F1]/25 purple:shadow-[#9333EA]/30 active:scale-[0.985] transition-all"
            >
              <PrimaryIcon className="w-4 h-4 shrink-0" />
              <span>{primaryActionLabel}</span>
            </button>

            {secondaryUrl && (
              <button
                type="button"
                onClick={() =>
                  void openAppLinkExternally(
                    secondaryUrl,
                    secondaryUrl.toLowerCase().includes('play.google.com')
                      ? 'playstore'
                      : 'site'
                  )
                }
                className="min-h-[48px] px-5 rounded-xl bg-[#F4F5F9] dark:bg-[#0F0E13] purple:bg-[#170E2B] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] hover:border-[#6366F1]/50 purple:hover:border-[#A855F7]/60 text-[#111827] dark:text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
              >
                <ExternalLink className="w-4 h-4 shrink-0" />
                <span>{secondaryLabel}</span>
              </button>
            )}
          </div>
        </section>

        {/* Description */}
        {app.descricao?.trim() && (
          <section className="rounded-2xl bg-white dark:bg-[#1B1924] purple:bg-[#20143A] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] p-4 sm:p-5 space-y-2.5">
            <h3 className="text-sm sm:text-base font-bold text-[#111827] dark:text-white">
              {t.apps.aboutApp}
            </h3>
            <p className="text-sm text-[#374151] dark:text-[#D1D5DB] purple:text-[#DDD6FE] whitespace-pre-line leading-relaxed">
              {app.descricao.trim()}
            </p>
          </section>
        )}

        {/* Screenshots & GIFs Gallery */}
        <MediaGallery
          title={t.details.photoGallery}
          items={galleryMedia}
          itemTitle={app.nome}
          showCountInTitle
        />
      </main>
    </div>
  );
}
