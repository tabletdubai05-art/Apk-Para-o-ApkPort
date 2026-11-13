import type { DownloadTask } from '../types/game';
import {
  appendDownloadChunk,
  clearDownloadChunksOnly,
  deleteDownloadTask,
  getDownloadChunks,
  saveDownloadTask,
} from '../utils/downloadDb';
import { parseSizeToBytes } from '../utils/formatters';

interface WebTorrentFile {
  name: string;
  length: number;
  getBlobURL: (cb: (err: Error | null, url?: string) => void) => void;
}

interface WebTorrentTorrent {
  files: WebTorrentFile[];
  progress: number;
  downloaded: number;
  length: number;
  downloadSpeed: number;
  numPeers: number;
  addWebSeed: (url: string) => void;
  on: (event: string, cb: (...args: unknown[]) => void) => void;
  destroy: (opts?: unknown, cb?: () => void) => void;
}

interface WebTorrentClient {
  add: (
    torrentId: string,
    opts: Record<string, unknown>,
    onTorrent?: (torrent: WebTorrentTorrent) => void
  ) => WebTorrentTorrent;
  on: (event: string, cb: (err: Error) => void) => void;
  destroy: (cb?: () => void) => void;
}

declare global {
  interface Window {
    WebTorrent?: new () => WebTorrentClient;
  }
}

type TaskUpdateCallback = (task: DownloadTask) => void;

interface ActiveController {
  cancel: () => void;
}

const activeControllers = new Map<string, ActiveController>();

function triggerBrowserSave(blobUrl: string, fileName: string) {
  const anchor = document.createElement('a');
  anchor.href = blobUrl;
  anchor.download = fileName;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  setTimeout(() => {
    document.body.removeChild(anchor);
  }, 1500);
}

async function ensureWebTorrentLoaded(): Promise<typeof window.WebTorrent | null> {
  if (typeof window === 'undefined') return null;
  if (window.WebTorrent) return window.WebTorrent;

  // Wait briefly if deferred script is still loading
  for (let i = 0; i < 15; i++) {
    await new Promise((r) => setTimeout(r, 150));
    if (window.WebTorrent) return window.WebTorrent;
  }

  // Attempt dynamic script injection if CDN script wasn't loaded yet
  return new Promise((resolve) => {
    const existing = document.querySelector('script[data-webtorrent-cdn]');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.WebTorrent ?? null));
      existing.addEventListener('error', () => resolve(null));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/webtorrent@1.9.7/webtorrent.min.js';
    script.async = true;
    script.dataset.webtorrentCdn = 'true';
    script.onload = () => resolve(window.WebTorrent ?? null);
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
}

async function startFetchStreamDownload(
  initialTask: DownloadTask,
  onUpdate: TaskUpdateCallback,
  isCancelled: () => boolean
): Promise<void> {
  const url = initialTask.webseed_url || initialTask.torrent_url;
  if (!url) {
    const failed: DownloadTask = {
      ...initialTask,
      status: 'error',
      speedBytesPerSec: 0,
      errorMessage: 'Nenhum link de download (WebSeed ou Torrent) disponível.',
      updatedAt: Date.now(),
    };
    await saveDownloadTask(failed);
    onUpdate(failed);
    return;
  }

  const abortController = new AbortController();
  const prevController = activeControllers.get(initialTask.gameId);
  activeControllers.set(initialTask.gameId, {
    cancel: () => {
      abortController.abort();
      prevController?.cancel();
    },
  });

  try {
    // Check IndexedDB for existing partial chunks to resume
    const saved = await getDownloadChunks(initialTask.gameId);
    let existingBytes = saved.totalBytes;
    let nextChunkIndex = saved.nextIndex;
    const accumulatedChunks: Uint8Array[] = [...saved.chunks];

    const headers: HeadersInit = {};
    if (existingBytes > 0) {
      headers['Range'] = `bytes=${existingBytes}-`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
      signal: abortController.signal,
    });

    if (!response.ok && response.status !== 206) {
      throw new Error(`HTTP ${response.status} ao baixar arquivo.`);
    }

    // If server returned 200 OK instead of 206 Partial Content, restart from 0
    if (existingBytes > 0 && response.status === 200) {
      await clearDownloadChunksOnly(initialTask.gameId);
      existingBytes = 0;
      nextChunkIndex = 0;
      accumulatedChunks.length = 0;
    }

    const contentLengthHeader = response.headers.get('content-length');
    const contentRangeHeader = response.headers.get('content-range');

    let totalBytes = initialTask.totalBytes || parseSizeToBytes(initialTask.tamanho);
    if (contentRangeHeader) {
      const match = contentRangeHeader.match(/\/(\d+)$/);
      if (match) totalBytes = parseInt(match[1], 10);
    } else if (contentLengthHeader) {
      const parsedLen = parseInt(contentLengthHeader, 10);
      if (!Number.isNaN(parsedLen) && parsedLen > 0) {
        totalBytes = existingBytes + parsedLen;
      }
    }

    if (!response.body) {
      throw new Error('Navegador não suportou ReadableStream para este download.');
    }

    const reader = response.body.getReader();
    let downloadedBytes = existingBytes;
    let windowBytes = 0;
    let windowStart = performance.now();
    let lastUiUpdate = 0;

    // Buffer small reads into ~512KB chunks before persisting to IndexedDB
    let pendingBuffer: Uint8Array[] = [];
    let pendingSize = 0;
    const CHUNK_PERSIST_THRESHOLD = 512 * 1024;

    const flushPendingChunks = async () => {
      if (pendingSize === 0) return;
      const merged = new Uint8Array(pendingSize);
      let offset = 0;
      for (const part of pendingBuffer) {
        merged.set(part, offset);
        offset += part.byteLength;
      }
      await appendDownloadChunk(initialTask.gameId, nextChunkIndex++, merged);
      pendingBuffer = [];
      pendingSize = 0;
    };

    const startingTask: DownloadTask = {
      ...initialTask,
      status: 'downloading',
      mode: 'http-fallback',
      downloadedBytes,
      totalBytes,
      progress: totalBytes > 0 ? Math.min(99.9, (downloadedBytes / totalBytes) * 100) : 0,
      peers: 0,
      updatedAt: Date.now(),
    };
    await saveDownloadTask(startingTask);
    onUpdate(startingTask);

    while (true) {
      if (isCancelled()) {
        await reader.cancel();
        return;
      }

      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      accumulatedChunks.push(value);
      pendingBuffer.push(value);
      pendingSize += value.byteLength;
      downloadedBytes += value.byteLength;
      windowBytes += value.byteLength;

      if (pendingSize >= CHUNK_PERSIST_THRESHOLD) {
        await flushPendingChunks();
      }

      const now = performance.now();
      const elapsedSec = (now - windowStart) / 1000;
      if (now - lastUiUpdate >= 250) {
        const speed = elapsedSec > 0.1 ? windowBytes / elapsedSec : 0;
        const progress =
          totalBytes > 0 ? Math.min(99.9, (downloadedBytes / totalBytes) * 100) : 0;

        const progressTask: DownloadTask = {
          ...startingTask,
          status: 'downloading',
          mode: 'http-fallback',
          downloadedBytes,
          totalBytes: Math.max(totalBytes, downloadedBytes),
          progress,
          speedBytesPerSec: speed,
          peers: 0,
          updatedAt: Date.now(),
        };
        onUpdate(progressTask);
        void saveDownloadTask(progressTask);

        lastUiUpdate = now;
        if (elapsedSec >= 1.5) {
          windowBytes = 0;
          windowStart = now;
        }
      }
    }

    if (isCancelled()) return;

    await flushPendingChunks();

    const blobParts = accumulatedChunks.map(
      (chunk) => chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength) as ArrayBuffer
    );
    const finalBlob = new Blob(blobParts, {
      type: 'application/vnd.android.package-archive',
    });
    const blobUrl = URL.createObjectURL(finalBlob);

    const completedTask: DownloadTask = {
      ...startingTask,
      status: 'completed',
      mode: 'http-fallback',
      downloadedBytes,
      totalBytes: downloadedBytes,
      progress: 100,
      speedBytesPerSec: 0,
      peers: 0,
      blobUrl,
      updatedAt: Date.now(),
    };

    await saveDownloadTask(completedTask);
    await clearDownloadChunksOnly(initialTask.gameId);
    onUpdate(completedTask);
    triggerBrowserSave(blobUrl, completedTask.fileName);
    activeControllers.delete(initialTask.gameId);
  } catch (err) {
    if (isCancelled() || (err instanceof DOMException && err.name === 'AbortError')) {
      return;
    }

    const message =
      err instanceof Error
        ? err.message
        : 'Falha no download direto (possível bloqueio de CORS ou rede).';

    const erroredTask: DownloadTask = {
      ...initialTask,
      status: 'error',
      speedBytesPerSec: 0,
      errorMessage: message,
      updatedAt: Date.now(),
    };
    await saveDownloadTask(erroredTask);
    onUpdate(erroredTask);
    activeControllers.delete(initialTask.gameId);
  }
}

export async function startHybridDownload(
  task: DownloadTask,
  onUpdate: TaskUpdateCallback
): Promise<void> {
  // Cancel any existing controller for this gameId
  activeControllers.get(task.gameId)?.cancel();

  let cancelled = false;
  let switchedToFallback = false;
  let client: WebTorrentClient | null = null;
  let activeTorrent: WebTorrentTorrent | null = null;
  let pollInterval: number | null = null;
  let fallbackTimer: number | null = null;

  const cleanupWebTorrent = () => {
    if (pollInterval !== null) {
      window.clearInterval(pollInterval);
      pollInterval = null;
    }
    if (fallbackTimer !== null) {
      window.clearTimeout(fallbackTimer);
      fallbackTimer = null;
    }
    try {
      activeTorrent?.destroy();
    } catch {
      // Ignore destroy errors
    }
    try {
      client?.destroy();
    } catch {
      // Ignore destroy errors
    }
    activeTorrent = null;
    client = null;
  };

  activeControllers.set(task.gameId, {
    cancel: () => {
      cancelled = true;
      cleanupWebTorrent();
    },
  });

  const initialTask: DownloadTask = {
    ...task,
    status: 'starting',
    errorMessage: undefined,
    updatedAt: Date.now(),
  };
  await saveDownloadTask(initialTask);
  onUpdate(initialTask);

  // If no torrent_url, or if there are already partial HTTP chunks in IndexedDB, go straight to fetch+ReadableStream
  const existingChunks = await getDownloadChunks(task.gameId);
  if (!task.torrent_url || existingChunks.totalBytes > 0) {
    await startFetchStreamDownload(
      {
        ...initialTask,
        mode: 'http-fallback',
      },
      onUpdate,
      () => cancelled
    );
    return;
  }

  const WebTorrentCtor = await ensureWebTorrentLoaded();
  if (!WebTorrentCtor || cancelled) {
    if (!cancelled && task.webseed_url) {
      await startFetchStreamDownload(
        {
          ...initialTask,
          mode: 'http-fallback',
        },
        onUpdate,
        () => cancelled
      );
    } else if (!cancelled) {
      const errTask: DownloadTask = {
        ...initialTask,
        status: 'error',
        errorMessage: 'Motor WebTorrent indisponível e sem WebSeed configurada.',
        updatedAt: Date.now(),
      };
      await saveDownloadTask(errTask);
      onUpdate(errTask);
    }
    return;
  }

  const triggerFallback = async () => {
    if (cancelled || switchedToFallback) return;
    switchedToFallback = true;
    cleanupWebTorrent();

    if (task.webseed_url) {
      await startFetchStreamDownload(
        {
          ...initialTask,
          mode: 'http-fallback',
        },
        onUpdate,
        () => cancelled
      );
    } else {
      const errTask: DownloadTask = {
        ...initialTask,
        status: 'error',
        errorMessage: 'Trackers P2P bloqueados e nenhuma WebSeed disponível.',
        updatedAt: Date.now(),
      };
      await saveDownloadTask(errTask);
      onUpdate(errTask);
    }
  };

  try {
    client = new WebTorrentCtor();

    client.on('error', () => {
      void triggerFallback();
    });

    // If WebTorrent does not transfer data within 8.5s (e.g. WebRTC/tracker blocked), auto-fallback to fetch+ReadableStream
    fallbackTimer = window.setTimeout(() => {
      if (!activeTorrent || activeTorrent.downloaded === 0) {
        void triggerFallback();
      }
    }, 8500);

    const torrentOpts: Record<string, unknown> = {
      announce: [
        'wss://tracker.openwebtorrent.com',
        'wss://tracker.btorrent.xyz',
        'wss://tracker.fastcast.nz',
      ],
    };
    if (task.webseed_url) {
      torrentOpts.urlList = [task.webseed_url];
    }

    activeTorrent = client.add(task.torrent_url, torrentOpts, (torrent) => {
      if (cancelled || switchedToFallback) {
        torrent.destroy();
        return;
      }

      if (task.webseed_url) {
        try {
          torrent.addWebSeed(task.webseed_url);
        } catch {
          // Ignore duplicate webseed
        }
      }

      pollInterval = window.setInterval(() => {
        if (cancelled || switchedToFallback) return;

        const downloaded = torrent.downloaded || 0;
        const total = torrent.length || initialTask.totalBytes || parseSizeToBytes(initialTask.tamanho);
        const progress = Math.min(99.9, (torrent.progress || 0) * 100);

        if (downloaded > 0 && fallbackTimer !== null) {
          window.clearTimeout(fallbackTimer);
          fallbackTimer = null;
        }

        const updated: DownloadTask = {
          ...initialTask,
          status: 'downloading',
          mode: 'webtorrent',
          downloadedBytes: downloaded,
          totalBytes: total,
          progress,
          speedBytesPerSec: torrent.downloadSpeed || 0,
          peers: torrent.numPeers || 0,
          updatedAt: Date.now(),
        };
        onUpdate(updated);
        void saveDownloadTask(updated);
      }, 450);

      torrent.on('done', () => {
        if (cancelled || switchedToFallback) return;
        if (pollInterval !== null) {
          window.clearInterval(pollInterval);
          pollInterval = null;
        }
        if (fallbackTimer !== null) {
          window.clearTimeout(fallbackTimer);
          fallbackTimer = null;
        }

        const targetFile =
          torrent.files.find((f) => f.name.toLowerCase().endsWith('.apk')) ||
          torrent.files[0];

        const finalize = (blobUrl?: string) => {
          const completed: DownloadTask = {
            ...initialTask,
            status: 'completed',
            mode: 'webtorrent',
            downloadedBytes: torrent.length || initialTask.totalBytes,
            totalBytes: torrent.length || initialTask.totalBytes,
            progress: 100,
            speedBytesPerSec: 0,
            peers: torrent.numPeers || 0,
            fileName: targetFile?.name || initialTask.fileName,
            blobUrl,
            updatedAt: Date.now(),
          };
          void saveDownloadTask(completed);
          onUpdate(completed);
          if (blobUrl) {
            triggerBrowserSave(blobUrl, completed.fileName);
          }
          activeControllers.delete(task.gameId);
        };

        if (targetFile) {
          targetFile.getBlobURL((err, url) => {
            if (err || !url) {
              finalize(undefined);
            } else {
              finalize(url);
            }
          });
        } else {
          finalize(undefined);
        }
      });

      torrent.on('error', () => {
        void triggerFallback();
      });
    });

    activeTorrent.on('error', () => {
      void triggerFallback();
    });
  } catch {
    await triggerFallback();
  }
}

export async function cancelDownloadTask(
  gameId: string,
  onRemove?: () => void
): Promise<void> {
  const controller = activeControllers.get(gameId);
  if (controller) {
    controller.cancel();
    activeControllers.delete(gameId);
  }
  await deleteDownloadTask(gameId);
  onRemove?.();
}

export function triggerSavedBlobDownload(blobUrl: string, fileName: string): void {
  triggerBrowserSave(blobUrl, fileName);
}
