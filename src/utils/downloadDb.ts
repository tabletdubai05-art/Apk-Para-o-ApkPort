import type { DownloadTask } from '../types/game';

const DB_NAME = 'droidport_downloads_db';
const DB_VERSION = 2;
const STORE_TASKS = 'tasks';
const STORE_CHUNKS = 'chunks';

interface ChunkRecord {
  key: string;
  taskId: string;
  index: number;
  data: Uint8Array;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB não suportado neste navegador.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (db.objectStoreNames.contains(STORE_TASKS)) {
        db.deleteObjectStore(STORE_TASKS);
      }
      if (db.objectStoreNames.contains(STORE_CHUNKS)) {
        db.deleteObjectStore(STORE_CHUNKS);
      }
      db.createObjectStore(STORE_TASKS, { keyPath: 'taskId' });
      const chunkStore = db.createObjectStore(STORE_CHUNKS, { keyPath: 'key' });
      chunkStore.createIndex('taskId', 'taskId', { unique: false });
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveDownloadTask(task: DownloadTask): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_TASKS, 'readwrite');
    const store = tx.objectStore(STORE_TASKS);
    store.put(task);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Fail gracefully if storage quota is exceeded or unavailable
  }
}

export async function loadAllDownloadTasks(): Promise<DownloadTask[]> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_TASKS, 'readonly');
    const store = tx.objectStore(STORE_TASKS);
    const request = store.getAll();

    const tasks = await new Promise<DownloadTask[]>((resolve, reject) => {
      request.onsuccess = () => resolve((request.result as DownloadTask[]) || []);
      request.onerror = () => reject(request.error);
    });

    db.close();
    return tasks.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export async function deleteDownloadTask(taskId: string): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction([STORE_TASKS, STORE_CHUNKS], 'readwrite');
    tx.objectStore(STORE_TASKS).delete(taskId);

    const chunkStore = tx.objectStore(STORE_CHUNKS);
    const index = chunkStore.index('taskId');
    const cursorReq = index.openKeyCursor(IDBKeyRange.only(taskId));

    cursorReq.onsuccess = () => {
      const cursor = cursorReq.result;
      if (cursor) {
        chunkStore.delete(cursor.primaryKey);
        cursor.continue();
      }
    };

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Ignore cleanup errors
  }
}

export async function appendDownloadChunk(
  taskId: string,
  index: number,
  data: Uint8Array
): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_CHUNKS, 'readwrite');
    const store = tx.objectStore(STORE_CHUNKS);
    const record: ChunkRecord = {
      key: `${taskId}_${String(index).padStart(8, '0')}`,
      taskId,
      index,
      data,
    };
    store.put(record);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Non-fatal if chunk persistence hits quota
  }
}

export async function getDownloadChunks(
  taskId: string
): Promise<{ chunks: Uint8Array[]; totalBytes: number; nextIndex: number }> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_CHUNKS, 'readonly');
    const index = tx.objectStore(STORE_CHUNKS).index('taskId');
    const request = index.getAll(IDBKeyRange.only(taskId));

    const records = await new Promise<ChunkRecord[]>((resolve, reject) => {
      request.onsuccess = () => resolve((request.result as ChunkRecord[]) || []);
      request.onerror = () => reject(request.error);
    });

    db.close();
    records.sort((a, b) => a.index - b.index);
    const chunks = records.map((r) => r.data);
    const totalBytes = chunks.reduce((acc, chunk) => acc + chunk.byteLength, 0);
    const nextIndex = records.length > 0 ? records[records.length - 1].index + 1 : 0;

    return { chunks, totalBytes, nextIndex };
  } catch {
    return { chunks: [], totalBytes: 0, nextIndex: 0 };
  }
}

export async function clearDownloadChunksOnly(taskId: string): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_CHUNKS, 'readwrite');
    const chunkStore = tx.objectStore(STORE_CHUNKS);
    const index = chunkStore.index('taskId');
    const cursorReq = index.openKeyCursor(IDBKeyRange.only(taskId));

    cursorReq.onsuccess = () => {
      const cursor = cursorReq.result;
      if (cursor) {
        chunkStore.delete(cursor.primaryKey);
        cursor.continue();
      }
    };

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Ignore
  }
}

export async function clearAllDownloadCache(): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction([STORE_TASKS, STORE_CHUNKS], 'readwrite');
    tx.objectStore(STORE_TASKS).clear();
    tx.objectStore(STORE_CHUNKS).clear();
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Ignore
  }
}
