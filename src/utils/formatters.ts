import type { Jogo, JogoArquivo, TutorialItem } from '../types/game';

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

export function parsePhotos(fotosUrls?: string | string[] | null): string[] {
  if (!fotosUrls) return [];
  if (Array.isArray(fotosUrls)) {
    return fotosUrls.map((u) => String(u).trim()).filter(Boolean);
  }
  return fotosUrls
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean);
}

export interface ParsedVideo {
  type: 'youtube' | 'direct';
  src: string;
}

export function parseVideoSource(videoUrl?: string | null): ParsedVideo | null {
  if (!videoUrl) return null;
  const url = videoUrl.trim();
  if (!url) return null;

  try {
    // Handle YouTube URLs: watch?v=, youtu.be/, shorts/, live/, embed/
    const ytMatch = url.match(
      /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    );
    if (ytMatch && ytMatch[1]) {
      return {
        type: 'youtube',
        src: `https://www.youtube.com/embed/${ytMatch[1]}?rel=0&modestbranding=1`,
      };
    }

    return {
      type: 'direct',
      src: url,
    };
  } catch {
    return {
      type: 'direct',
      src: url,
    };
  }
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

  if (Array.isArray(rawArquivos) && rawArquivos.length > 0) {
    const valid = rawArquivos
      .filter(
        (item) =>
          item &&
          ((typeof item.url === 'string' && item.url.trim() !== '') ||
            (typeof item.torrent_url === 'string' && item.torrent_url.trim() !== ''))
      )
      .map((item, idx) => {
        const itemUrl = typeof item.url === 'string' ? item.url.trim() : '';
        const itemTorrent =
          typeof item.torrent_url === 'string' && item.torrent_url.trim() !== ''
            ? item.torrent_url.trim()
            : idx === 0 && typeof jogo.torrent_url === 'string' && jogo.torrent_url.trim() !== ''
            ? jogo.torrent_url.trim()
            : null;

        return {
          nome: (item.nome || `Arquivo ${idx + 1}`).trim(),
          tamanho: (item.tamanho || jogo.tamanho || '').trim(),
          url: itemUrl,
          torrent_url: itemTorrent,
        };
      });

    if (valid.length > 0) {
      return valid;
    }
  }

  if (jogo.webseed_url || jogo.torrent_url) {
    return [
      {
        nome: 'APK Principal',
        tamanho: jogo.tamanho || '',
        url: jogo.webseed_url?.trim() || '',
        torrent_url: jogo.torrent_url?.trim() || null,
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
      const url = typeof item.url === 'string' ? item.url.trim() : '';
      const titulo =
        typeof item.titulo === 'string' && item.titulo.trim()
          ? item.titulo.trim()
          : `Tutorial ${idx + 1}`;
      return { titulo, url };
    })
    .filter((item) => item.url !== '');
}
