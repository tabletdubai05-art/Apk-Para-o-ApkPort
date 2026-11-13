import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import type { PluginListenerHandle } from '@capacitor/core';
import type { DownloadTask } from '../types/game';
import {
  appendDownloadChunk,
  clearDownloadChunksOnly,
  deleteDownloadTask,
  getDownloadChunks,
  saveDownloadTask,
} from '../utils/downloadDb';
import {
  extractFileNameFromUrl,
  parseSizeToBytes,
  sanitizeFolderName,
} from '../utils/formatters';

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
let activeNativeCount = 0;

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

  for (let i = 0; i < 15; i++) {
    await new Promise((r) => setTimeout(r, 150));
    if (window.WebTorrent) return window.WebTorrent;
  }

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

async function startCapacitorNativeDownload(
  initialTask: DownloadTask,
  onUpdate: TaskUpdateCallback
): Promise<void> {
  const url = initialTask.webseed_url;
  if (!url) {
    const errTask: DownloadTask = {
      ...initialTask,
      status: 'error',
      mode: 'capacitor-native',
      speedBytesPerSec: 0,
      errorMessage: 'URL do arquivo indisponível para download nativo.',
      updatedAt: Date.now(),
    };
    await saveDownloadTask(errTask);
    onUpdate(errTask);
    return;
  }

  let cancelled = false;
  let listenerHandle: PluginListenerHandle | null = null;
  activeNativeCount += 1;

  const cleanupListener = async () => {
    if (listenerHandle) {
      try {
        await listenerHandle.remove();
      } catch {
        // Ignore listener removal errors
      }
      listenerHandle = null;
    }
  };

  activeControllers.set(initialTask.taskId, {
    cancel: () => {
      cancelled = true;
      void cleanupListener();
    },
  });

  const nomeLimpoDoPort = sanitizeFolderName(initialTask.titulo);
  const fallbackBase = sanitizeFolderName(initialTask.arquivoNome || initialTask.titulo);
  const nomeOriginalDoArquivo = extractFileNameFromUrl(url, fallbackBase);
  const folderPath = `Download/${nomeLimpoDoPort}`;
  const targetPath = `${folderPath}/${nomeOriginalDoArquivo}`;
  const displaySavedPath = `Downloads/${nomeLimpoDoPort}/${nomeOriginalDoArquivo}`;
  const fallbackTotalBytes = initialTask.totalBytes || parseSizeToBytes(initialTask.tamanho);

  const startingTask: DownloadTask = {
    ...initialTask,
    status: 'downloading',
    mode: 'capacitor-native',
    fileName: nomeOriginalDoArquivo,
    savedPath: undefined,
    downloadedBytes: 0,
    totalBytes: fallbackTotalBytes,
    progress: 0,
    speedBytesPerSec: 0,
    peers: 0,
    errorMessage: undefined,
    updatedAt: Date.now(),
  };
  await saveDownloadTask(startingTask);
  onUpdate(startingTask);

  try {
    try {
      const perm = await Filesystem.checkPermissions();
      if (perm.publicStorage !== 'granted') {
        await Filesystem.requestPermissions();
      }
    } catch {
      // Ignore if already granted or scoped storage handles it
    }

    try {
      await Filesystem.mkdir({
        path: folderPath,
        directory: Directory.ExternalStorage,
        recursive: true,
      });
    } catch {
      // Directory may already exist
    }

    let lastBytes = 0;
    let lastTime = performance.now();

    listenerHandle = await Filesystem.addListener('progress', (status) => {
      if (cancelled) return;

      if (status.url !== url && activeNativeCount > 1) {
        return;
      }

      const now = performance.now();
      const elapsedSec = (now - lastTime) / 1000;
      const downloaded = status.bytes || 0;
      const total =
        status.contentLength && status.contentLength > 0
          ? status.contentLength
          : fallbackTotalBytes;

      let speed = startingTask.speedBytesPerSec;
      if (elapsedSec >= 0.25) {
        const deltaBytes = Math.max(0, downloaded - lastBytes);
        speed = deltaBytes / elapsedSec;
        lastBytes = downloaded;
        lastTime = now;
      }

      const progress =
        total > 0 ? Math.min(99.9, (downloaded / total) * 100) : 0;

      const updated: DownloadTask = {
        ...startingTask,
        status: 'downloading',
        mode: 'capacitor-native',
        downloadedBytes: downloaded,
        totalBytes: Math.max(total, downloaded),
        progress,
        speedBytesPerSec: speed,
        peers: 0,
        updatedAt: Date.now(),
      };
      onUpdate(updated);
      void saveDownloadTask(updated);
    });

    await Filesystem.downloadFile({
      url,
      path: targetPath,
      directory: Directory.ExternalStorage,
      progress: true,
    });

    await cleanupListener();
    activeNativeCount = Math.max(0, activeNativeCount - 1);

    if (cancelled) {
      try {
        await Filesystem.deleteFile({
          path: targetPath,
          directory: Directory.ExternalStorage,
        });
      } catch {
        // Ignore cleanup failure
      }
      return;
    }

    const completedTask: DownloadTask = {
      ...startingTask,
      status: 'completed',
      mode: 'capacitor-native',
      downloadedBytes: fallbackTotalBytes,
      totalBytes: fallbackTotalBytes,
      progress: 100,
      speedBytesPerSec: 0,
      peers: 0,
      savedPath: displaySavedPath,
      updatedAt: Date.now(),
    };
    await saveDownloadTask(completedTask);
    onUpdate(completedTask);
    activeControllers.delete(initialTask.taskId);
  } catch (err) {
    await cleanupListener();
    activeNativeCount = Math.max(0, activeNativeCount - 1);

    if (cancelled) return;

    const message =
      err instanceof Error
        ? err.message
        : 'Falha no download nativo. Toque em Tentar novamente para reiniciar.';

    const erroredTask: DownloadTask = {
      ...startingTask,
      status: 'error',
      mode: 'capacitor-native',
      speedBytesPerSec: 0,
      errorMessage: message,
      updatedAt: Date.now(),
    };
    await saveDownloadTask(erroredTask);
    onUpdate(erroredTask);
    activeControllers.delete(initialTask.taskId);
  }
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
      errorMessage: 'Nenhum link de download disponível para este arquivo.',
      updatedAt: Date.now(),
    };
    await saveDownloadTask(failed);
    onUpdate(failed);
    return;
  }

  const abortController = new AbortController();
  const prevController = activeControllers.get(initialTask.taskId);
  activeControllers.set(initialTask.taskId, {
    cancel: () => {
      abortController.abort();
      prevController?.cancel();
    },
  });

  try {
    const saved = await getDownloadChunks(initialTask.taskId);
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

    if (existingBytes > 0 && response.status === 200) {
      await clearDownloadChunksOnly(initialTask.taskId);
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
      await appendDownloadChunk(initialTask.taskId, nextChunkIndex++, merged);
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
      (chunk) =>
        chunk.buffer.slice(
          chunk.byteOffset,
          chunk.byteOffset + chunk.byteLength
        ) as ArrayBuffer
    );
    const mimeType = initialTask.fileName.toLowerCase().endsWith('.apk')
      ? 'application/vnd.android.package-archive'
      : 'application/octet-stream';
    const finalBlob = new Blob(blobParts, { type: mimeType });
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
    await clearDownloadChunksOnly(initialTask.taskId);
    onUpdate(completedTask);
    triggerBrowserSave(blobUrl, completedTask.fileName);
    activeControllers.delete(initialTask.taskId);
  } catch (err) {
    if (isCancelled() || (err instanceof DOMException && err.name === 'AbortError')) {
      return;
    }

    const message =
      err instanceof Error
        ? err.message
        : 'Falha no download direto (possível bloqueio de CORS ou redirecionamento).';

    const erroredTask: DownloadTask = {
      ...initialTask,
      status: 'error',
      speedBytesPerSec: 0,
      errorMessage: message,
      updatedAt: Date.now(),
    };
    await saveDownloadTask(erroredTask);
    onUpdate(erroredTask);
    activeControllers.delete(initialTask.taskId);
  }
}

export async function startHybridDownload(
  task: DownloadTask,
  onUpdate: TaskUpdateCallback
): Promise<void> {
  activeControllers.get(task.taskId)?.cancel();

  if (Capacitor.isNativePlatform() && task.webseed_url) {
    await startCapacitorNativeDownload(task, onUpdate);
    return;
  }

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

  activeControllers.set(task.taskId, {
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

  const existingChunks = await getDownloadChunks(task.taskId);
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
        errorMessage: 'Motor WebTorrent indisponível e sem URL direta configurada.',
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
        errorMessage: 'Trackers P2P bloqueados e nenhuma URL direta disponível.',
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
        const total =
          torrent.length || initialTask.totalBytes || parseSizeToBytes(initialTask.tamanho);
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
          activeControllers.delete(task.taskId);
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
  taskId: string,
  onRemove?: () => void
): Promise<void> {
  const controller = activeControllers.get(taskId);
  if (controller) {
    controller.cancel();
    activeControllers.delete(taskId);
  }
  await deleteDownloadTask(taskId);
  onRemove?.();
}

export async function restartCleanDownload(
  task: DownloadTask,
  onUpdate: TaskUpdateCallback
): Promise<void> {
  const controller = activeControllers.get(task.taskId);
  if (controller) {
    controller.cancel();
    activeControllers.delete(task.taskId);
  }
  if (task.blobUrl) {
    try {
      URL.revokeObjectURL(task.blobUrl);
    } catch {
      // Ignore revoke failure
    }
  }
  await clearDownloadChunksOnly(task.taskId);

  const resetTask: DownloadTask = {
    ...task,
    status: 'starting',
    progress: 0,
    downloadedBytes: 0,
    speedBytesPerSec: 0,
    peers: 0,
    savedPath: undefined,
    errorMessage: undefined,
    blobUrl: undefined,
    updatedAt: Date.now(),
  };
  await saveDownloadTask(resetTask);
  onUpdate(resetTask);

  await startHybridDownload(resetTask, onUpdate);
}

export function triggerSavedBlobDownload(blobUrl: string, fileName: string): void {
  triggerBrowserSave(blobUrl, fileName);
}
