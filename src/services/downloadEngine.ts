import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import type { DownloadTask } from '../types/game';
import {
  clearDownloadChunksOnly,
  deleteDownloadTask,
  saveDownloadTask,
} from '../utils/downloadDb';
import { extractFileNameFromUrl, sanitizeFolderName } from '../utils/formatters';
import {
  buildSafeAndroidP2PIntentUrl,
  buildSafeArchiveServerUrl,
  LIBRETORRENT_PLAY_STORE_URL,
  normalizeArchiveOrgDownloadUrl,
  parseSafeArchiveOrgDownloadUrl,
  sanitizeDirectDownloadUrl,
  sanitizeExternalItemUrl,
  sanitizeMagnetUri,
  sanitizeP2PTorrentUrl,
} from '../utils/urlSecurity';

type TaskUpdateCallback = (task: DownloadTask) => void;

const ARCHIVE_METADATA_TIMEOUT_MS = 3000;

export { LIBRETORRENT_PLAY_STORE_URL };

function normalizeArchiveOrgUrl(rawUrl: string): string {
  return normalizeArchiveOrgDownloadUrl(rawUrl);
}

async function resolveDirectDownloadUrl(rawUrl: string): Promise<string | null> {
  const safeDirectUrl = sanitizeDirectDownloadUrl(rawUrl);
  if (!safeDirectUrl) {
    return null;
  }

  const parsed = parseSafeArchiveOrgDownloadUrl(safeDirectUrl);
  if (!parsed) {
    return safeDirectUrl;
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
      return parsed.normalizedUrl;
    }

    const data = (await response.json()) as {
      d1?: unknown;
      dir?: unknown;
    };

    const resolvedServerUrl = buildSafeArchiveServerUrl(
      data.d1,
      data.dir,
      parsed.filePath
    );
    return resolvedServerUrl ?? parsed.normalizedUrl;
  } catch {
    return parsed.normalizedUrl;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function openUrlInSystemBrowser(url: string): Promise<boolean> {
  const safeUrl = sanitizeDirectDownloadUrl(url);
  if (!safeUrl) return false;

  try {
    await Browser.open({ url: safeUrl });
    return true;
  } catch {
    const opened = window.open(safeUrl, '_blank', 'noopener,noreferrer');
    if (!opened) {
      window.open(safeUrl, '_system');
    }
    return true;
  }
}

export function isAndroidDevice(): boolean {
  if (Capacitor.getPlatform() === 'android') {
    return true;
  }
  if (typeof navigator !== 'undefined') {
    return /android/i.test(navigator.userAgent);
  }
  return false;
}

export function buildAndroidP2PIntentUrl(rawUrl: string): string | null {
  return buildSafeAndroidP2PIntentUrl(rawUrl);
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  const trimmed = text.trim();
  if (!trimmed) return false;

  try {
    await navigator.clipboard.writeText(trimmed);
    return true;
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = trimmed;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      return document.execCommand('copy');
    } catch {
      return false;
    } finally {
      document.body.removeChild(textarea);
    }
  }
}

export function openP2PIntent(targetUrl?: string | null): boolean {
  const safeTarget = sanitizeP2PTorrentUrl(targetUrl);
  if (!safeTarget) return false;

  if (isAndroidDevice()) {
    const intentUrl = buildSafeAndroidP2PIntentUrl(safeTarget);
    if (!intentUrl) return false;
    window.location.href = intentUrl;
    return true;
  }

  if (sanitizeDirectDownloadUrl(safeTarget)) {
    window.open(safeTarget, '_blank', 'noopener,noreferrer');
    return true;
  }

  if (sanitizeMagnetUri(safeTarget)) {
    window.location.href = safeTarget;
    return true;
  }

  return false;
}

export async function openSystemDownloadManager(
  url?: string | null
): Promise<boolean> {
  if (!url) return false;
  const directUrl = await resolveDirectDownloadUrl(url);
  if (!directUrl) return false;
  return openUrlInSystemBrowser(directUrl);
}

export async function openExternalItemLink(
  url?: string | null
): Promise<boolean> {
  const safeUrl = sanitizeExternalItemUrl(url);
  if (!safeUrl) return false;

  if (Capacitor.isNativePlatform()) {
    // Dispara shouldOverrideUrlLoading -> Bridge.launchIntent -> Intent.ACTION_VIEW / Uri.parse(url)
    // abrindo diretamente no navegador externo ou no app da Play Store sem sair da tela atual.
    window.location.href = safeUrl;
    return true;
  }

  const opened = window.open(safeUrl, '_blank', 'noopener,noreferrer');
  if (!opened) {
    window.open(safeUrl, '_system');
  }
  return true;
}

export async function startHybridDownload(
  task: DownloadTask,
  onUpdate: TaskUpdateCallback
): Promise<void> {
  const now = Date.now();

  if (task.method === 'p2p' || task.mode === 'p2p-intent') {
    const safeTorrentUrl = sanitizeP2PTorrentUrl(task.torrent_url);
    if (!safeTorrentUrl) {
      const errTask: DownloadTask = {
        ...task,
        status: 'error',
        errorMessage: 'Link P2P inválido ou bloqueado por segurança.',
        updatedAt: now,
      };
      await saveDownloadTask(errTask);
      onUpdate(errTask);
      return;
    }

    const opened = openP2PIntent(safeTorrentUrl);
    if (!opened) {
      const errTask: DownloadTask = {
        ...task,
        status: 'error',
        errorMessage: 'Não foi possível abrir o link P2P com segurança.',
        updatedAt: now,
      };
      await saveDownloadTask(errTask);
      onUpdate(errTask);
      return;
    }

    const dispatchedP2P: DownloadTask = {
      ...task,
      torrent_url: safeTorrentUrl,
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

  const rawUrl = task.webseed_url || task.torrent_url;
  const safeInputUrl = sanitizeDirectDownloadUrl(rawUrl);
  if (!safeInputUrl) {
    const errTask: DownloadTask = {
      ...task,
      status: 'error',
      speedBytesPerSec: 0,
      errorMessage:
        'Link de download inválido ou inseguro (HTTPS obrigatório).',
      updatedAt: now,
    };
    await saveDownloadTask(errTask);
    onUpdate(errTask);
    return;
  }

  const nomeLimpoDoPort = sanitizeFolderName(task.titulo);
  const normalizedUrl = normalizeArchiveOrgUrl(safeInputUrl);
  const nomeRealDoArquivo = extractFileNameFromUrl(normalizedUrl, nomeLimpoDoPort);

  const directUrl = await resolveDirectDownloadUrl(normalizedUrl);
  if (!directUrl || !(await openUrlInSystemBrowser(directUrl))) {
    const errTask: DownloadTask = {
      ...task,
      status: 'error',
      speedBytesPerSec: 0,
      errorMessage: 'Não foi possível validar o servidor de download.',
      updatedAt: now,
    };
    await saveDownloadTask(errTask);
    onUpdate(errTask);
    return;
  }

  const dispatchedTask: DownloadTask = {
    ...task,
    webseed_url: directUrl,
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
