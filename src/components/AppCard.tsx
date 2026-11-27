import { Browser } from '@capacitor/browser';
import { Download, ExternalLink, Globe, Smartphone } from 'lucide-react';
import { usePreferences } from '../context/PreferencesContext';
import { isNativeApp } from '../lib/communitySupabase';
import { openSystemDownloadManager } from '../services/downloadEngine';
import type { AppItem, AppLinkType } from '../types/game';
import { parseCategories, parsePhotos } from '../utils/formatters';
import { GameCover } from './GameCover';

export function detectAppLinkType(app: AppItem): AppLinkType {
  const rawType = (app.tipo_link || '').trim().toLowerCase();
  if (rawType === 'playstore' || rawType === 'play_store') return 'playstore';
  if (rawType === 'site' || rawType === 'web') return 'site';
  if (rawType === 'download' || rawType === 'apk') return 'download';

  const url = (app.link_url || '').trim().toLowerCase();
  if (url.includes('play.google.com') || url.startsWith('market://')) {
    return 'playstore';
  }
  if (
    /\.(apk|xapk|zip|apks)(\?|$)/i.test(url) ||
    url.includes('archive.org/download/') ||
    url.includes('/releases/download/')
  ) {
    return 'download';
  }
  return 'site';
}

export function hasAppDetails(app: AppItem): boolean {
  if (app.descricao && app.descricao.trim().length > 0) return true;
  if (parsePhotos(app.fotos_urls).length > 0) return true;
  if (app.link_secundario_url && app.link_secundario_url.trim().length > 0) {
    return true;
  }
  return false;
}

export async function openAppLinkExternally(
  url: string,
  linkType: AppLinkType
): Promise<void> {
  const trimmed = url.trim();
  if (!trimmed) return;

  if (linkType === 'download') {
    await openSystemDownloadManager(trimmed);
    return;
  }

  if (isNativeApp()) {
    try {
      await Browser.open({ url: trimmed });
      return;
    } catch {
      window.open(trimmed, '_system');
      return;
    }
  }

  window.open(trimmed, '_blank', 'noopener,noreferrer');
}

interface AppCardProps {
  app: AppItem;
  onSelect: (app: AppItem) => void;
  onQuickOpen: (app: AppItem) => void;
}

function getLinkTypeLabel(
  linkType: AppLinkType,
  t: ReturnType<typeof usePreferences>['t']
): string {
  if (linkType === 'playstore') return t.apps.linkTypePlayStore;
  if (linkType === 'site') return t.apps.linkTypeSite;
  return t.apps.linkTypeDownload;
}

function getAppMetadataLine(
  app: AppItem,
  linkType: AppLinkType,
  t: ReturnType<typeof usePreferences>['t']
): string {
  const parts: string[] = [];
  if (app.versao?.trim()) parts.push(app.versao.trim());
  if (app.tamanho?.trim()) parts.push(app.tamanho.trim());
  parts.push(getLinkTypeLabel(linkType, t));
  return parts.join(' • ');
}

export function ListAppCard({ app, onSelect, onQuickOpen }: AppCardProps) {
  const { t } = usePreferences();
  const linkType = detectAppLinkType(app);
  const detailed = hasAppDetails(app);
  const cats = parseCategories(app.categoria);
  const catLine =
    cats.length > 0 ? cats.join(' • ') : getLinkTypeLabel(linkType, t);
  const metaLine = getAppMetadataLine(app, linkType, t);
  const coverSrc = app.icone_url?.trim() || '';

  const handlePrimaryClick = () => {
    if (detailed) {
      onSelect(app);
    } else {
      onQuickOpen(app);
    }
  };

  const ActionIcon =
    linkType === 'download'
      ? Download
      : linkType === 'site'
      ? Globe
      : ExternalLink;

  return (
    <article
      onClick={handlePrimaryClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handlePrimaryClick();
        }
      }}
      className="group flex items-center gap-3.5 p-3 rounded-2xl bg-white dark:bg-[#1B1924] purple:bg-[#20143A] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] cursor-pointer transition-colors duration-150 hover:border-[#6366F1]/50 purple:hover:border-[#A855F7]/65 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366F1]"
    >
      <div className="relative w-20 h-20 sm:w-22 sm:h-22 shrink-0 rounded-xl overflow-hidden bg-[#F0F1F6] dark:bg-[#14121B] purple:bg-[#170E2B] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466]">
        {coverSrc ? (
          <GameCover src={coverSrc} alt={app.nome} className="w-full h-full" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#6366F1]/75 purple:text-[#C084FC]/85">
            <Smartphone className="w-7 h-7" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
        <h3 className="text-base font-bold text-[#111827] dark:text-white leading-snug line-clamp-1 group-hover:text-[#6366F1] dark:group-hover:text-[#A5B4FC] purple:group-hover:text-[#D8B4FE] transition-colors">
          {app.nome}
        </h3>
        <p className="text-xs font-medium text-[#6366F1] dark:text-[#8B5CF6] purple:text-[#C084FC] line-clamp-1">
          {catLine}
        </p>
        <p className="text-xs text-[#525866] dark:text-[#9CA3AF] purple:text-[#C4B5FD] line-clamp-1 font-mono-nums">
          {metaLine}
        </p>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onQuickOpen(app);
        }}
        aria-label={`${t.apps.openLink} ${app.nome}`}
        className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-[#F4F5F9] dark:bg-[#0F0E13] purple:bg-[#170E2B] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] text-[#6366F1] dark:text-[#A5B4FC] purple:text-[#C084FC] hover:bg-[#6366F1] hover:text-white purple:hover:bg-[#9333EA] purple:hover:text-white transition-colors shrink-0"
      >
        <ActionIcon className="w-4 h-4" />
      </button>
    </article>
  );
}

export function GridAppCard({ app, onSelect, onQuickOpen }: AppCardProps) {
  const { t } = usePreferences();
  const linkType = detectAppLinkType(app);
  const detailed = hasAppDetails(app);
  const cats = parseCategories(app.categoria);
  const catLine =
    cats.length > 0 ? cats.join(' • ') : getLinkTypeLabel(linkType, t);
  const metaLine = getAppMetadataLine(app, linkType, t);
  const coverSrc = app.icone_url?.trim() || '';

  const handlePrimaryClick = () => {
    if (detailed) {
      onSelect(app);
    } else {
      onQuickOpen(app);
    }
  };

  return (
    <article
      onClick={handlePrimaryClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handlePrimaryClick();
        }
      }}
      className="group flex flex-col rounded-2xl bg-white dark:bg-[#1B1924] purple:bg-[#20143A] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] overflow-hidden cursor-pointer transition-colors duration-150 hover:border-[#6366F1]/50 purple:hover:border-[#A855F7]/65 active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366F1]"
    >
      <div className="relative aspect-[4/3] w-full bg-[#F0F1F6] dark:bg-[#14121B] purple:bg-[#170E2B] overflow-hidden">
        {coverSrc ? (
          <GameCover
            src={coverSrc}
            alt={app.nome}
            className="w-full h-full transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#6366F1]/75 purple:text-[#C084FC]/85">
            <Smartphone className="w-8 h-8" />
          </div>
        )}
      </div>

      <div className="p-3 flex flex-col gap-1">
        <h3 className="text-sm font-bold text-[#111827] dark:text-white leading-snug line-clamp-1 group-hover:text-[#6366F1] dark:group-hover:text-[#A5B4FC] purple:group-hover:text-[#D8B4FE] transition-colors">
          {app.nome}
        </h3>
        <p className="text-[11px] font-medium text-[#6366F1] dark:text-[#8B5CF6] purple:text-[#C084FC] line-clamp-1">
          {catLine}
        </p>
        <p className="text-[11px] text-[#525866] dark:text-[#9CA3AF] purple:text-[#C4B5FD] line-clamp-1 font-mono-nums">
          {metaLine}
        </p>
      </div>
    </article>
  );
}
