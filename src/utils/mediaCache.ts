import type { GalleryMediaKind } from './formatters';

export interface CachedGalleryAsset {
  src: string;
  isBlob: boolean;
  naturalWidth?: number;
  naturalHeight?: number;
}

const MAX_CACHE_ENTRIES = 30;
const MAX_REMOTE_BLOB_BYTES = 25 * 1024 * 1024; // 25 MB safety cap for mobile RAM
const FETCH_TIMEOUT_MS = 12_000;

const resolvedCache = new Map<string, CachedGalleryAsset>();
const inFlightCache = new Map<string, Promise<CachedGalleryAsset>>();

function storeInCache(key: string, asset: CachedGalleryAsset): CachedGalleryAsset {
  // Refresh LRU order if key already exists
  if (resolvedCache.has(key)) {
    resolvedCache.delete(key);
  } else if (resolvedCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = resolvedCache.keys().next().value;
    if (oldestKey !== undefined) {
      const oldest = resolvedCache.get(oldestKey);
      resolvedCache.delete(oldestKey);
      if (oldest?.isBlob && oldest.src.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(oldest.src);
        } catch {
          // Ignore revoke errors
        }
      }
    }
  }

  resolvedCache.set(key, asset);
  return asset;
}

async function decodeDataUrlToBlobAsync(dataUrl: string): Promise<Blob | null> {
  // Fast native browser path (C++ off-thread decoding)
  try {
    const response = await fetch(dataUrl);
    if (response.ok) {
      return await response.blob();
    }
  } catch {
    // Fallback below if CSP blocks fetch() on data: URLs
  }

  try {
    const commaIndex = dataUrl.indexOf(',');
    if (commaIndex === -1) return null;

    const header = dataUrl.slice(0, commaIndex);
    const base64 = dataUrl.slice(commaIndex + 1);
    const mimeMatch = /^data:([^;]+);base64$/i.exec(header);
    if (!mimeMatch || !base64) return null;

    const mime = mimeMatch[1].toLowerCase();

    // Yield to browser before heavy base64 decode
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });

    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    const CHUNK_SIZE = 65536;

    for (let offset = 0; offset < len; offset += CHUNK_SIZE) {
      const end = Math.min(offset + CHUNK_SIZE, len);
      for (let i = offset; i < end; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      if (end < len) {
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      }
    }

    return new Blob([bytes], { type: mime });
  } catch {
    return null;
  }
}

async function fetchRemoteMediaBlobAsync(
  url: string
): Promise<Blob | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      mode: 'cors',
      cache: 'force-cache',
      signal: controller.signal,
    });

    if (!response.ok) return null;

    const contentLengthHeader = response.headers.get('content-length');
    if (contentLengthHeader) {
      const declaredSize = Number.parseInt(contentLengthHeader, 10);
      if (Number.isFinite(declaredSize) && declaredSize > MAX_REMOTE_BLOB_BYTES) {
        return null;
      }
    }

    const blob = await response.blob();
    if (!blob || blob.size === 0 || blob.size > MAX_REMOTE_BLOB_BYTES) {
      return null;
    }

    return blob;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function probeImageDimensionsAsync(
  src: string
): Promise<{ width?: number; height?: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.referrerPolicy = 'no-referrer';
    img.decoding = 'async';

    let settled = false;
    const finish = (width?: number, height?: number) => {
      if (settled) return;
      settled = true;
      resolve({ width, height });
    };

    img.onload = () => {
      const w = img.naturalWidth || undefined;
      const h = img.naturalHeight || undefined;
      if (typeof img.decode === 'function') {
        img
          .decode()
          .then(() => finish(w, h))
          .catch(() => finish(w, h));
      } else {
        finish(w, h);
      }
    };

    img.onerror = () => finish(undefined, undefined);
    img.src = src;
  });
}

export function getCachedGalleryAssetSync(
  rawUrl: string
): CachedGalleryAsset | null {
  return resolvedCache.get(rawUrl) ?? null;
}

export async function loadGalleryAssetAsync(
  rawUrl: string,
  kind: GalleryMediaKind
): Promise<CachedGalleryAsset> {
  const cached = resolvedCache.get(rawUrl);
  if (cached) {
    // Bump LRU freshness
    resolvedCache.delete(rawUrl);
    resolvedCache.set(rawUrl, cached);
    return cached;
  }

  const existingInFlight = inFlightCache.get(rawUrl);
  if (existingInFlight) {
    return existingInFlight;
  }

  const task = (async (): Promise<CachedGalleryAsset> => {
    try {
      // 1. data:image/...;base64,... -> decode asynchronously to Blob URL
      if (rawUrl.startsWith('data:')) {
        const blob = await decodeDataUrlToBlobAsync(rawUrl);
        if (blob) {
          const blobUrl = URL.createObjectURL(blob);
          const dims =
            kind !== 'video' ? await probeImageDimensionsAsync(blobUrl) : {};
          return storeInCache(rawUrl, {
            src: blobUrl,
            isBlob: true,
            naturalWidth: dims.width,
            naturalHeight: dims.height,
          });
        }
        return storeInCache(rawUrl, { src: rawUrl, isBlob: false });
      }

      // 2. GIFs and short looping videos -> async fetch + Blob cache (CORS permitting)
      if (kind === 'gif' || kind === 'video') {
        const blob = await fetchRemoteMediaBlobAsync(rawUrl);
        if (blob) {
          const blobUrl = URL.createObjectURL(blob);
          const dims =
            kind === 'gif' ? await probeImageDimensionsAsync(blobUrl) : {};
          return storeInCache(rawUrl, {
            src: blobUrl,
            isBlob: true,
            naturalWidth: dims.width,
            naturalHeight: dims.height,
          });
        }
      }

      // 3. Fallback / regular images -> async pre-decode & direct URL cache
      const dims =
        kind !== 'video' ? await probeImageDimensionsAsync(rawUrl) : {};
      return storeInCache(rawUrl, {
        src: rawUrl,
        isBlob: false,
        naturalWidth: dims.width,
        naturalHeight: dims.height,
      });
    } finally {
      inFlightCache.delete(rawUrl);
    }
  })();

  inFlightCache.set(rawUrl, task);
  return task;
}

export function updateCachedAssetDimensions(
  rawUrl: string,
  naturalWidth: number,
  naturalHeight: number
): void {
  const existing = resolvedCache.get(rawUrl);
  if (existing && (!existing.naturalWidth || !existing.naturalHeight)) {
    resolvedCache.set(rawUrl, {
      ...existing,
      naturalWidth,
      naturalHeight,
    });
  }
}
