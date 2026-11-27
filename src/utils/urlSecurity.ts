const CONTROL_CHARS_RE = /[\u0000-\u001F\u007F]/;
const INJECTED_INTENT_RE = /(?:^|[#&;?])(?:intent:|#intent;|s\.browser_fallback_url=|;end(?:$|[?#&;]))/i;
const IPV4_LITERAL_RE = /^\d{1,3}(?:\.\d{1,3}){3}$/;
const SHA256_HEX_RE = /^[a-fA-F0-9]{64}$/;
const YOUTUBE_ID_RE = /^[a-zA-Z0-9_-]{11}$/;
const ARCHIVE_ITEM_ID_RE = /^[a-zA-Z0-9._-]+$/;
const ARCHIVE_D1_HOST_RE = /^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.archive\.org$/i;

export const LIBRETORRENT_PACKAGE = 'org.proninyaroslav.libretorrent';
export const LIBRETORRENT_PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=org.proninyaroslav.libretorrent';

export const DEFAULT_ALLOWED_APK_HOSTS = [
  'github.com',
  'objects.githubusercontent.com',
  'release-assets.githubusercontent.com',
  'githubusercontent.com',
  'archive.org',
  'mfwzkzywxvbbonsshjgh.supabase.co',
] as const;

export const DISCORD_ALLOWED_HOSTS = [
  'discord.gg',
  'discord.com',
  'discordapp.com',
] as const;

function readEnvVar(name: string): string {
  try {
    const metaEnv = (import.meta as unknown as { env?: Record<string, unknown> })?.env;
    const val = metaEnv?.[name];
    if (typeof val === 'string') return val;
  } catch {
    // Ignore when not running under Vite
  }
  if (typeof process !== 'undefined' && process.env) {
    const val = process.env[name];
    if (typeof val === 'string') return val;
  }
  return '';
}

function parseEnvHostList(name: string): string[] {
  const raw = readEnvVar(name);
  if (!raw.trim()) return [];
  return raw
    .split(',')
    .map((h) => h.trim().toLowerCase().replace(/^\*\./, ''))
    .filter(Boolean);
}

export function getAllowedApkHosts(): string[] {
  const extra = parseEnvHostList('VITE_ALLOWED_APK_HOSTS');
  return Array.from(new Set([...DEFAULT_ALLOWED_APK_HOSTS, ...extra]));
}

export function getConfiguredDownloadHosts(): string[] {
  return parseEnvHostList('VITE_ALLOWED_DOWNLOAD_HOSTS');
}

export function isHostInAllowlist(hostname: string, allowlist: readonly string[]): boolean {
  const normalized = hostname.trim().toLowerCase().replace(/\.$/, '');
  if (!normalized) return false;
  return allowlist.some((allowed) => {
    const target = allowed.trim().toLowerCase().replace(/^\*\./, '');
    if (!target) return false;
    return normalized === target || normalized.endsWith(`.${target}`);
  });
}

function isPrivateOrLocalHost(hostname: string): boolean {
  const host = hostname.trim().toLowerCase().replace(/^\[|\]$/g, '');
  if (!host) return true;

  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host === '::1' ||
    host.startsWith('fe80:') ||
    host.startsWith('fc') ||
    host.startsWith('fd')
  ) {
    return true;
  }

  if (IPV4_LITERAL_RE.test(host)) {
    const octets = host.split('.').map((n) => Number.parseInt(n, 10));
    if (octets.some((o) => Number.isNaN(o) || o > 255)) return true;
    const [a, b] = octets;
    if (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127)
    ) {
      return true;
    }
  }

  return false;
}

export interface SanitizeHttpUrlOptions {
  requireHttps?: boolean;
  allowedHosts?: readonly string[];
  blockPrivateHosts?: boolean;
  rejectIpLiterals?: boolean;
}

export function sanitizeHttpUrl(
  rawUrl: unknown,
  options: SanitizeHttpUrlOptions = {}
): string | null {
  if (typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!trimmed || CONTROL_CHARS_RE.test(trimmed)) return null;

  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('file:') ||
    lower.startsWith('intent:') ||
    lower.startsWith('content:') ||
    lower.startsWith('blob:')
  ) {
    return null;
  }

  // Reject scheme-relative URLs or backslashes in scheme prefix
  if (trimmed.startsWith('//') || /^https?\\:/i.test(trimmed)) {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  const requireHttps = options.requireHttps ?? false;
  if (requireHttps) {
    if (parsed.protocol !== 'https:') return null;
  } else if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return null;
  }

  if (parsed.username || parsed.password) {
    return null;
  }

  if (!parsed.hostname) {
    return null;
  }

  const blockPrivate = options.blockPrivateHosts ?? true;
  if (blockPrivate && isPrivateOrLocalHost(parsed.hostname)) {
    return null;
  }

  if (options.rejectIpLiterals && (IPV4_LITERAL_RE.test(parsed.hostname) || parsed.hostname.includes(':'))) {
    return null;
  }

  if (options.allowedHosts && options.allowedHosts.length > 0) {
    if (!isHostInAllowlist(parsed.hostname, options.allowedHosts)) {
      return null;
    }
  }

  return parsed.toString();
}

export function sanitizeApkUpdateUrl(rawUrl: unknown): string | null {
  return sanitizeHttpUrl(rawUrl, {
    requireHttps: true,
    allowedHosts: getAllowedApkHosts(),
    blockPrivateHosts: true,
    rejectIpLiterals: true,
  });
}

export function sanitizeDiscordUrl(rawUrl: unknown): string | null {
  if (typeof rawUrl !== 'string') return null;
  let trimmed = rawUrl.trim();
  if (!trimmed) return null;

  if (/^(?:www\.)?discord\.(?:gg|com)\//i.test(trimmed)) {
    trimmed = `https://${trimmed}`;
  } else if (/^http:\/\/(?:www\.)?discord\.(?:gg|com)\//i.test(trimmed)) {
    trimmed = trimmed.replace(/^http:\/\//i, 'https://');
  }

  return sanitizeHttpUrl(trimmed, {
    requireHttps: true,
    allowedHosts: DISCORD_ALLOWED_HOSTS,
    blockPrivateHosts: true,
    rejectIpLiterals: true,
  });
}

const SAFE_DATA_IMAGE_RE = /^data:image\/(gif|png|jpe?g|webp);base64,([A-Za-z0-9+/=\s]+)$/i;

export function sanitizeSafeDataImageUrl(rawUrl: unknown): string | null {
  if (typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!trimmed || CONTROL_CHARS_RE.test(trimmed)) return null;

  const match = SAFE_DATA_IMAGE_RE.exec(trimmed);
  if (!match) return null;

  const subtype = match[1].toLowerCase();
  const base64Body = match[2].replace(/\s+/g, '');
  if (!base64Body) return null;

  return `data:image/${subtype};base64,${base64Body}`;
}

export function sanitizeImageUrl(rawUrl: unknown): string | null {
  if (typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!trimmed || CONTROL_CHARS_RE.test(trimmed)) return null;

  const safeDataImage = sanitizeSafeDataImageUrl(trimmed);
  if (safeDataImage) {
    return safeDataImage;
  }

  // Allow safe local public paths (e.g. /icon.png, /assets/...)
  if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.includes('\\')) {
    return trimmed;
  }

  return sanitizeHttpUrl(trimmed, {
    requireHttps: false,
    blockPrivateHosts: true,
  });
}

export function sanitizeGalleryMediaUrl(rawUrl: unknown): string | null {
  return sanitizeImageUrl(rawUrl);
}

export function sanitizeMediaUrl(rawUrl: unknown): string | null {
  return sanitizeHttpUrl(rawUrl, {
    requireHttps: false,
    blockPrivateHosts: true,
  });
}

export function normalizeArchiveOrgDownloadUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  try {
    const parsed = new URL(trimmed);
    if (isHostInAllowlist(parsed.hostname, ['archive.org'])) {
      parsed.protocol = 'https:';
      parsed.pathname = parsed.pathname.replace(/^\/details\//i, '/download/');
      return parsed.toString();
    }
  } catch {
    // Fall through to null check in caller
  }
  return trimmed;
}

export function parseSafeArchiveOrgDownloadUrl(
  rawUrl: unknown
): { itemId: string; filePath: string; normalizedUrl: string } | null {
  const safeUrl = sanitizeHttpUrl(
    typeof rawUrl === 'string' ? normalizeArchiveOrgDownloadUrl(rawUrl) : rawUrl,
    {
      requireHttps: true,
      allowedHosts: ['archive.org'],
      blockPrivateHosts: true,
      rejectIpLiterals: true,
    }
  );
  if (!safeUrl) return null;

  try {
    const parsed = new URL(safeUrl);
    const idx = parsed.pathname.indexOf('/download/');
    if (idx === -1) return null;

    const remainder = parsed.pathname.slice(idx + '/download/'.length);
    const segments = remainder.split('/').filter(Boolean);
    if (segments.length < 2) return null;

    const itemId = decodeURIComponent(segments[0]).trim();
    if (!ARCHIVE_ITEM_ID_RE.test(itemId) || itemId === '.' || itemId === '..') {
      return null;
    }

    const fileSegments = segments.slice(1);
    if (fileSegments.some((s) => s === '.' || s === '..')) {
      return null;
    }

    const filePath = fileSegments.join('/');
    return { itemId, filePath, normalizedUrl: safeUrl };
  } catch {
    return null;
  }
}

export function buildSafeArchiveServerUrl(
  server: unknown,
  dir: unknown,
  filePath: string
): string | null {
  if (typeof server !== 'string' || typeof dir !== 'string') return null;

  const cleanServer = server.trim().toLowerCase();
  if (!ARCHIVE_D1_HOST_RE.test(cleanServer)) {
    return null;
  }

  const cleanDir = dir.trim();
  if (
    !cleanDir.startsWith('/') ||
    cleanDir.includes('..') ||
    cleanDir.includes('\\') ||
    cleanDir.includes('?') ||
    cleanDir.includes('#') ||
    cleanDir.includes('@') ||
    CONTROL_CHARS_RE.test(cleanDir)
  ) {
    return null;
  }

  const normalizedDir = cleanDir.replace(/\/+$/, '');
  const cleanFilePath = filePath.replace(/^\/+/, '');
  if (!cleanFilePath || cleanFilePath.includes('..') || cleanFilePath.includes('\\')) {
    return null;
  }

  return sanitizeHttpUrl(`https://${cleanServer}${normalizedDir}/${cleanFilePath}`, {
    requireHttps: true,
    allowedHosts: ['archive.org'],
    blockPrivateHosts: true,
    rejectIpLiterals: true,
  });
}

export function sanitizeDirectDownloadUrl(rawUrl: unknown): string | null {
  if (typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!trimmed || CONTROL_CHARS_RE.test(trimmed) || INJECTED_INTENT_RE.test(trimmed)) {
    return null;
  }

  const maybeArchiveNormalized = normalizeArchiveOrgDownloadUrl(trimmed);
  const configuredDownloadHosts = getConfiguredDownloadHosts();

  return sanitizeHttpUrl(maybeArchiveNormalized, {
    requireHttps: true,
    allowedHosts: configuredDownloadHosts.length > 0 ? configuredDownloadHosts : undefined,
    blockPrivateHosts: true,
    rejectIpLiterals: true,
  });
}

export function sanitizeMagnetUri(rawUrl: unknown): string | null {
  if (typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!trimmed || CONTROL_CHARS_RE.test(trimmed)) return null;

  // Block any embedded Android Intent directives or delimiters
  if (/#Intent;|;end(?:$|[?#&;])|intent:|S\.browser_fallback_url=/i.test(trimmed)) {
    return null;
  }

  if (!/^magnet:\?/i.test(trimmed)) {
    return null;
  }

  // Strip any hash fragment to prevent Intent URI injection via #
  if (trimmed.includes('#')) {
    return null;
  }

  const query = trimmed.slice('magnet:?'.length);
  if (!query) return null;

  const params = new URLSearchParams(query);
  const xtValues = params.getAll('xt');
  const hasValidHash = xtValues.some(
    (xt) =>
      /^urn:btih:(?:[a-fA-F0-9]{40}|[a-zA-Z2-7]{32})$/.test(xt.trim()) ||
      /^urn:btmh:1220[a-fA-F0-9]{64}$/.test(xt.trim())
  );

  if (!hasValidHash) {
    return null;
  }

  return `magnet:?${query}`;
}

export function sanitizeP2PTorrentUrl(rawUrl: unknown): string | null {
  if (typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!trimmed || CONTROL_CHARS_RE.test(trimmed)) return null;

  if (/^magnet:/i.test(trimmed)) {
    return sanitizeMagnetUri(trimmed);
  }

  if (/#Intent;|;end(?:$|[?#&;])|S\.browser_fallback_url=/i.test(trimmed)) {
    return null;
  }

  return sanitizeDirectDownloadUrl(trimmed);
}

export function buildSafeAndroidP2PIntentUrl(rawUrl: unknown): string | null {
  const safeTarget = sanitizeP2PTorrentUrl(rawUrl);
  if (!safeTarget) return null;

  const encodedFallback = encodeURIComponent(LIBRETORRENT_PLAY_STORE_URL);

  if (/^magnet:\?/i.test(safeTarget)) {
    const magnetPayload = safeTarget.slice('magnet:'.length);
    return `intent://${magnetPayload}#Intent;scheme=magnet;package=${LIBRETORRENT_PACKAGE};S.browser_fallback_url=${encodedFallback};end`;
  }

  if (/^https:\/\//i.test(safeTarget)) {
    const urlWithoutHttps = safeTarget.slice('https://'.length);
    return `intent://${urlWithoutHttps}#Intent;scheme=https;type=application/x-bittorrent;package=${LIBRETORRENT_PACKAGE};S.browser_fallback_url=${encodedFallback};end`;
  }

  return null;
}

export function parseSafeYoutubeEmbedUrl(rawUrl: unknown): string | null {
  const safeUrl = sanitizeMediaUrl(rawUrl);
  if (!safeUrl) return null;

  try {
    const parsed = new URL(safeUrl);
    const host = parsed.hostname.toLowerCase();
    let videoId: string | null = null;

    if (host === 'youtu.be' || host === 'www.youtu.be') {
      videoId = parsed.pathname.split('/').filter(Boolean)[0] ?? null;
    } else if (
      host === 'youtube.com' ||
      host === 'www.youtube.com' ||
      host === 'm.youtube.com' ||
      host === 'youtube-nocookie.com' ||
      host === 'www.youtube-nocookie.com'
    ) {
      if (parsed.pathname === '/watch') {
        videoId = parsed.searchParams.get('v');
      } else {
        const match = parsed.pathname.match(/^\/(?:embed|shorts|live)\/([^/?#]+)/);
        videoId = match?.[1] ?? null;
      }
    }

    if (videoId && YOUTUBE_ID_RE.test(videoId)) {
      return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`;
    }
  } catch {
    return null;
  }

  return null;
}

export function sanitizeSha256Hex(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim().toLowerCase();
  return SHA256_HEX_RE.test(trimmed) ? trimmed : undefined;
}

export async function computeSha256Hex(data: ArrayBuffer | Uint8Array): Promise<string> {
  const bytes =
    data instanceof Uint8Array
      ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
      : new Uint8Array(data);
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', copy.buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function verifySha256Hex(
  data: ArrayBuffer | Uint8Array,
  expectedSha256: string
): Promise<boolean> {
  const normalizedExpected = sanitizeSha256Hex(expectedSha256);
  if (!normalizedExpected) return false;
  const actual = await computeSha256Hex(data);
  return actual === normalizedExpected;
}
