import { Browser } from '@capacitor/browser';
import type { DownloadTask } from '../types/game';
import {
  clearDownloadChunksOnly,
  deleteDownloadTask,
  saveDownloadTask,
} from '../utils/downloadDb';
import { extractFileNameFromUrl, sanitizeFolderName } from '../utils/formatters';

type TaskUpdateCallback = (task: DownloadTask) => void;

export async function openSystemDownloadManager(url?: string | null): Promise<void> {
  if (!url) return;
  try {
    await Browser.open({ url });
  } catch {
    window.open(url, '_system');
  }
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
  const nomeRealDoArquivo = extractFileNameFromUrl(url, nomeLimpoDoPort);

  try {
    await Browser.open({ url });
  } catch {
    window.open(url, '_system');
  }

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
