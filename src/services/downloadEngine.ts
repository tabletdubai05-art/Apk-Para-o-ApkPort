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

export async function openSystemDownloadManager(url?: string | null): Promise<void> {
  if (!url) return;
  const directUrl = await resolveDirectDownloadUrl(url);
  await openUrlInSystemBrowser(directUrl);
}

export async function startHybridDownload(
  task: DownloadTask,
  onUpdate: TaskUpdateCallback
): Promise<void> {
  const url = task.webseed_url || task.torrent_url;
  if (!url) {
    const errTask: DownloadTask = {
      ...task,
      status: 'error',
      speedBytesPerSec: 0,
      errorMessage: 'Nenhum link de download disponível para este arquivo.',
      updatedAt: Date.now(),
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
    fileName: nomeRealDoArquivo,
    progress: 100,
    speedBytesPerSec: 0,
    peers: 0,
    savedPath: undefined,
    errorMessage: undefined,
    updatedAt: Date.now(),
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

  const resetTask: DownloadTask = {
    ...task,
    status: 'starting',
    progress: 0,
    downloadedBytes: 0,
    speedBytesPerSec: 0,
    peers: 0,
    savedPath: undefined,
    errorMessage: undefined,
    updatedAt: Date.now(),
  };
  await saveDownloadTask(resetTask);
  onUpdate(resetTask);

  await startHybridDownload(resetTask, onUpdate);
}
