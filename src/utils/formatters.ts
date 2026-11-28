import type { Jogo, JogoArquivo, TutorialItem } from '../types/game';
import {
  parseSafeYoutubeEmbedUrl,
  sanitizeDirectDownloadUrl,
  sanitizeExternalItemUrl,
  sanitizeGalleryMediaUrl,
  sanitizeMediaUrl,
  sanitizeP2PTorrentUrl,
} from './urlSecurity';

export function parseCategories(categoria?: string | null): string[] {
  if (!categoria) return [];
  return categoria
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function formatCategoriesDot(categoria?: string | null): string {
  const cats = parseCategories(categoria);
  return cats.length > 0 ? cats.join(' • ') : 'Port Android';
}

export function parseSizeToBytes(tamanho?: string | null): number {
  if (!tamanho) return 0;
  const normalized = tamanho.replace(',', '.').trim().toUpperCase();
  const match = normalized.match(/([\d.]+)\s*(B|KB|MB|GB|TB)?/);
  if (!match) return 0;

  const value = parseFloat(match[1]);
  if (Number.isNaN(value)) return 0;

  const unit = match[2] || 'MB';
  const multipliers: Record<string, number> = {
    B: 1,
    KB: 1024,
    MB: 1024 * 1024,
    GB: 1024 * 1024 * 1024,
    TB: 1024 * 1024 * 1024 * 1024,
  };

  return value * (multipliers[unit] || 1024 * 1024);
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(2)} GB`;
  }
  return `${mb.toFixed(1)} MB`;
}

export function formatSpeedMBs(bytesPerSec: number): string {
  if (!bytesPerSec || bytesPerSec <= 0) return '0.00 MB/s';
  const mbPerSec = bytesPerSec / (1024 * 1024);
  return `${mbPerSec.toFixed(2)} MB/s`;
}

export type GalleryMediaKind = 'image' | 'gif' | 'video';

export interface GalleryMediaItem {
  url: string;
  kind: GalleryMediaKind;
}

const DATA_URI_HEADER_BEFORE_COMMA_RE = /^data:image\/[a-z0-9.+-]+(?:;[^,]*)?$/i;
const LOOP_VIDEO_EXT_RE = /\.(mp4|webm|mov|m4v)$/i;
const GIF_EXT_RE = /\.gif$/i;

function splitMediaListPreservingDataUrls(rawText: string): string[] {
  const trimmed = rawText.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item ?? '').trim()).filter(Boolean);
      }
    } catch {
      // Fall through to comma/newline parser
    }
  }

  const lines = trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const items: string[] = [];
  for (const line of lines) {
    const parts = line.split(',');
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].trim();
      if (!part) continue;

      if (
        DATA_URI_HEADER_BEFORE_COMMA_RE.test(part) &&
        i + 1 < parts.length
      ) {
        const base64Payload = parts[i + 1].trim();
        items.push(`${part},${base64Payload}`);
        i += 1;
      } else {
        items.push(part);
      }
    }
  }

  return items;
}

export function classifyGalleryMedia(url: string): GalleryMediaKind {
  const trimmed = url.trim();
  if (!trimmed) return 'image';

  if (/^data:image\/gif;/i.test(trimmed)) {
    return 'gif';
  }
  if (/^data:image\//i.test(trimmed)) {
    return 'image';
  }

  let pathname = trimmed;
  try {
    const parsed = new URL(trimmed);
    pathname = parsed.pathname;
  } catch {
    pathname = trimmed.split('?')[0].split('#')[0];
  }

  if (LOOP_VIDEO_EXT_RE.test(pathname)) {
    return 'video';
  }
  if (GIF_EXT_RE.test(pathname)) {
    return 'gif';
  }

  return 'image';
}

export function parsePhotos(fotosUrls?: string | string[] | null): string[] {
  if (!fotosUrls) return [];
  const rawList = Array.isArray(fotosUrls)
    ? fotosUrls.map((u) => String(u ?? '').trim()).filter(Boolean)
    : splitMediaListPreservingDataUrls(String(fotosUrls));

  return rawList
    .map((u) => sanitizeGalleryMediaUrl(u))
    .filter((u): u is string => Boolean(u));
}

export function parseGalleryMedia(
  fotosUrls?: string | string[] | null
): GalleryMediaItem[] {
  return parsePhotos(fotosUrls).map((url) => ({
    url,
    kind: classifyGalleryMedia(url),
  }));
}

export interface ParsedVideo {
  type: 'youtube' | 'direct';
  src: string;
}

export function parseVideoSource(videoUrl?: string | null): ParsedVideo | null {
  if (!videoUrl) return null;
  const url = videoUrl.trim();
  if (!url) return null;

  const youtubeEmbed = parseSafeYoutubeEmbedUrl(url);
  if (youtubeEmbed) {
    return {
      type: 'youtube',
      src: youtubeEmbed,
    };
  }

  const safeDirectMedia = sanitizeMediaUrl(url);
  if (!safeDirectMedia) {
    return null;
  }

  return {
    type: 'direct',
    src: safeDirectMedia,
  };
}

export function sanitizeFolderName(title: string): string {
  const cleaned = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return cleaned || 'Jogo_Android';
}

export function extractFileNameFromUrl(
  url?: string | null,
  fallbackBaseName = 'jogo'
): string {
  if (url) {
    try {
      const parsed = new URL(url);
      const lastSegment = parsed.pathname.split('/').filter(Boolean).pop();
      if (lastSegment) {
        const decoded = decodeURIComponent(lastSegment).trim();
        if (/^[^/\\]+\.[a-zA-Z0-9]{1,8}$/.test(decoded)) {
          return decoded.replace(/[<>:"/\\|?*]+/g, '_');
        }
      }
    } catch {
      const cleanPath = url.split('?')[0].split('#')[0];
      const lastSegment = cleanPath.split('/').filter(Boolean).pop();
      if (lastSegment) {
        const decoded = (() => {
          try {
            return decodeURIComponent(lastSegment).trim();
          } catch {
            return lastSegment.trim();
          }
        })();
        if (/^[^/\\]+\.[a-zA-Z0-9]{1,8}$/.test(decoded)) {
          return decoded.replace(/[<>:"/\\|?*]+/g, '_');
        }
      }
    }
  }
  return `${fallbackBaseName}.apk`;
}

export function sanitizeFileName(title: string): string {
  return `${sanitizeFolderName(title)}.apk`;
}

export function resolveGameFiles(jogo: Jogo): JogoArquivo[] {
  let rawArquivos = jogo.arquivos;

  if (typeof rawArquivos === 'string') {
    try {
      rawArquivos = JSON.parse(rawArquivos) as JogoArquivo[];
    } catch {
      rawArquivos = null;
    }
  }

  const fallbackTorrent = sanitizeP2PTorrentUrl(jogo.torrent_url);
  let fallbackTorrentUsed = false;

  if (Array.isArray(rawArquivos) && rawArquivos.length > 0) {
    const valid = rawArquivos
      .map((item, idx) => {
        if (!item || typeof item !== 'object') return null;

        const rawTipo =
          typeof item.tipo === 'string' ? item.tipo.trim().toLowerCase() : '';
        const isLinkItem = rawTipo === 'link';

        if (isLinkItem) {
          const safeLinkUrl = sanitizeExternalItemUrl(item.url);
          if (!safeLinkUrl) {
            return null;
          }

          const linkEntry: JogoArquivo = {
            tipo: 'link',
            nome:
              (typeof item.nome === 'string' && item.nome.trim()) ||
              `Link ${idx + 1}`,
            url: safeLinkUrl,
            torrent_url: null,
          };
          return linkEntry;
        }

        const safeUrl = sanitizeDirectDownloadUrl(item.url) ?? '';
        const explicitTorrent = sanitizeP2PTorrentUrl(item.torrent_url);
        let safeItemTorrent = explicitTorrent;
        if (!safeItemTorrent && !fallbackTorrentUsed && fallbackTorrent) {
          safeItemTorrent = fallbackTorrent;
          fallbackTorrentUsed = true;
        } else if (explicitTorrent) {
          fallbackTorrentUsed = true;
        }

        if (!safeUrl && !safeItemTorrent) {
          return null;
        }

        const entry: JogoArquivo = {
          tipo: 'normal',
          nome:
            (typeof item.nome === 'string' && item.nome.trim()) ||
            `Arquivo ${idx + 1}`,
          tamanho: (typeof item.tamanho === 'string'
            ? item.tamanho
            : jogo.tamanho || ''
          ).trim(),
          url: safeUrl,
          torrent_url: safeItemTorrent,
        };
        return entry;
      })
      .filter((item): item is JogoArquivo => item !== null);

    if (valid.length > 0) {
      return valid;
    }
  }

  const safeWebseed = sanitizeDirectDownloadUrl(jogo.webseed_url) ?? '';
  if (safeWebseed || fallbackTorrent) {
    return [
      {
        tipo: 'normal',
        nome: 'APK Principal',
        tamanho: jogo.tamanho || '',
        url: safeWebseed,
        torrent_url: fallbackTorrent,
      },
    ];
  }

  return [];
}

export function buildDownloadTaskId(
  gameId: string | number,
  arquivo: JogoArquivo,
  index: number
): string {
  return `${String(gameId)}__${index}__${sanitizeFolderName(arquivo.nome)}`;
}

export function buildP2PDownloadTaskId(
  gameId: string | number,
  arquivo: JogoArquivo,
  index: number
): string {
  return `${buildDownloadTaskId(gameId, arquivo, index)}__p2p`;
}

export function formatHistoryDateTime(timestamp: number): string {
  if (!timestamp || Number.isNaN(timestamp)) return '';
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(timestamp));
  } catch {
    return new Date(timestamp).toLocaleString('pt-BR');
  }
}

export function parseTutorials(
  tutoriais?: string | TutorialItem[] | null
): TutorialItem[] {
  if (!tutoriais) return [];

  let parsed: unknown = tutoriais;
  if (typeof tutoriais === 'string') {
    const trimmed = tutoriais.trim();
    if (!trimmed) return [];
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(parsed)) return [];

  return parsed
    .filter(
      (item): item is { titulo?: unknown; url?: unknown } =>
        Boolean(item) && typeof item === 'object'
    )
    .map((item, idx) => {
      const safeUrl = sanitizeMediaUrl(item.url);
      if (!safeUrl) return null;
      const titulo =
        typeof item.titulo === 'string' && item.titulo.trim()
          ? item.titulo.trim()
          : `Tutorial ${idx + 1}`;
      return { titulo, url: safeUrl };
    })
    .filter((item): item is TutorialItem => item !== null);
}
