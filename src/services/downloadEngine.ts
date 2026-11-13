import { Browser } from '@capacitor/browser';
import type { DownloadTask } from '../types/game';
import {
  clearDownloadChunksOnly,
  deleteDownloadTask,
  saveDownloadTask,
} from '../utils/downloadDb';
import { extractFileNameFromUrl, sanitizeFolderName } from '../utils/formatters';

type TaskUpdateCallback = (task: DownloadTask) => void;

const ARCHIVE_METADATA_TIMEOUT_MS = 3000;

function normalizeArchiveOrgUrl(rawUrl: string): string {
  return rawUrl.replace(/archive\.org\/details\//i, 'archive.org/download/');
}

function parseArchiveOrgDownloadUrl(
  rawUrl: string
): { itemId: string; filePath: string } | null {
  try {
    const parsed = new URL(rawUrl);
    if (!parsed.hostname.toLowerCase().includes('archive.org')) {
      return null;
    }
    const idx = parsed.pathname.indexOf('/download/');
    if (idx === -1) {
      return null;
    }
    const remainder = parsed.pathname.slice(idx + '/download/'.length);
    const segments = remainder.split('/').filter(Boolean);
    if (segments.length < 2) {
      return null;
    }
    const itemId = decodeURIComponent(segments[0]);
    const filePath = segments.slice(1).join('/');
    return { itemId, filePath };
  } catch {
    return null;
  }
}

async function resolveDirectDownloadUrl(rawUrl: string): Promise<string> {
  const normalizedUrl = normalizeArchiveOrgUrl(rawUrl.trim());
  const parsed = parseArchiveOrgDownloadUrl(normalizedUrl);
  if (!parsed) {
    return normalizedUrl;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ARCHIVE_METADATA_TIMEOUT_MS);

  try {
    const metadataUrl = `https://archive.org/metadata/${encodeURIComponent(parsed.itemId)}`;
    const response = await fetch(metadataUrl, {
      method: 'GET',
      signal: controller.signal,
    });
    if (!response.ok) {
      return normalizedUrl;
    }

    const data = (await response.json()) as {
      d1?: unknown;
      dir?: unknown;
    };

    if (
      typeof data.d1 === 'string' &&
      data.d1.trim() &&
      typeof data.dir === 'string' &&
      data.dir.trim()
    ) {
      const server = data.d1.trim();
      const rawDir = data.dir.trim();
      const dir = (rawDir.startsWith('/') ? rawDir : `/${rawDir}`).replace(/\/+$/, '');
      const filePath = parsed.filePath.replace(/^\/+/, '');
      return `https://${server}${dir}/${filePath}`;
    }

    return normalizedUrl;
  } catch {
    return normalizedUrl;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function openUrlInSystemBrowser(url: string): Promise<void> {
  try {
    await Browser.open({ url });
  } catch {
    window.open(url, '_system');
  }
}

export function openP2PIntent(targetUrl?: string | null): void {
  if (!targetUrl) return;
  const trimmed = targetUrl.trim();
  if (!trimmed) return;

  if (/^https:\/\//i.test(trimmed)) {
    const urlWithoutHttps = trimmed.replace(/^https:\/\//i, '');
    const intentUrl = `intent://${urlWithoutHttps}#Intent;scheme=https;type=application/x-bittorrent;package=org.proninyaroslav.libretorrent;end`;
    window.location.href = intentUrl;
    return;
  }

  if (/^http:\/\//i.test(trimmed)) {
    const urlWithoutHttp = trimmed.replace(/^http:\/\//i, '');
    const intentUrl = `intent://${urlWithoutHttp}#Intent;scheme=http;type=application/x-bittorrent;package=org.proninyaroslav.libretorrent;end`;
    window.location.href = intentUrl;
    return;
  }

  window.location.href = trimmed;
}

export async function openSystemDownloadManager(url?: string | null): Promise<void> {
  if (!url) return;
  const directUrl = await resolveDirectDownloadUrl(url);
  await openUrlInSystemBrowser(directUrl);
}

export async function startHybridDownload(
  task: DownloadTask,
  onUpdate: TaskUpdateCallback
): Promise<void> {
  const now = Date.now();

  if (task.method === 'p2p' || task.mode === 'p2p-intent') {
    const torrentUrl = task.torrent_url?.trim();
    if (!torrentUrl) {
      const errTask: DownloadTask = {
        ...task,
        status: 'error',
        errorMessage: 'Nenhum link P2P disponível para este arquivo.',
        updatedAt: now,
      };
      await saveDownloadTask(errTask);
      onUpdate(errTask);
      return;
    }

    openP2PIntent(torrentUrl);

    const dispatchedP2P: DownloadTask = {
      ...task,
      status: 'completed',
      mode: 'p2p-intent',
      method: 'p2p',
      progress: 0,
      downloadedBytes: 0,
      speedBytesPerSec: 0,
      peers: 0,
      savedPath: undefined,
      errorMessage: undefined,
      initiatedAt: now,
      updatedAt: now,
    };
    await saveDownloadTask(dispatchedP2P);
    onUpdate(dispatchedP2P);
    return;
  }

  const url = task.webseed_url || task.torrent_url;
  if (!url) {
    const errTask: DownloadTask = {
      ...task,
      status: 'error',
      speedBytesPerSec: 0,
      errorMessage: 'Nenhum link de download disponível para este arquivo.',
      updatedAt: now,
    };
    await saveDownloadTask(errTask);
    onUpdate(errTask);
    return;
  }

  const nomeLimpoDoPort = sanitizeFolderName(task.titulo);
  const normalizedUrl = normalizeArchiveOrgUrl(url.trim());
  const nomeRealDoArquivo = extractFileNameFromUrl(normalizedUrl, nomeLimpoDoPort);

  const directUrl = await resolveDirectDownloadUrl(normalizedUrl);
  await openUrlInSystemBrowser(directUrl);

  const dispatchedTask: DownloadTask = {
    ...task,
    status: 'completed',
    mode: 'system-browser',
    method: 'direct',
    fileName: nomeRealDoArquivo,
    progress: 0,
    downloadedBytes: 0,
    speedBytesPerSec: 0,
    peers: 0,
    savedPath: undefined,
    errorMessage: undefined,
    initiatedAt: now,
    updatedAt: now,
  };
  await saveDownloadTask(dispatchedTask);
  onUpdate(dispatchedTask);
}

export async function cancelDownloadTask(
  taskId: string,
  onRemove?: () => void
): Promise<void> {
  await deleteDownloadTask(taskId);
  onRemove?.();
}

export async function restartCleanDownload(
  task: DownloadTask,
  onUpdate: TaskUpdateCallback
): Promise<void> {
  await clearDownloadChunksOnly(task.taskId);
  await startHybridDownload(
    {
      ...task,
      initiatedAt: Date.now(),
      updatedAt: Date.now(),
    },
    onUpdate
  );
}
