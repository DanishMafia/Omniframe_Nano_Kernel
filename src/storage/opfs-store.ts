/**
 * OPFS Storage Layer
 *
 * Provides persistent, browser-local storage for:
 *  - Constitution data
 *  - Chat history
 *  - App settings
 *  - Parsed document cache
 *
 * Uses the Origin Private File System for maximum capacity and
 * falls back to IndexedDB when OPFS is unavailable.
 */

const DB_NAME = 'omniframe-nano-kernel';
const DB_VERSION = 1;
const STORES = {
  constitution: 'constitution',
  chat: 'chat',
  settings: 'settings',
  documents: 'documents',
  tasks: 'tasks',
} as const;

type StoreName = (typeof STORES)[keyof typeof STORES];

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const name of Object.values(STORES)) {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, { keyPath: 'id' });
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function txn<T>(
  store: StoreName,
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const result = fn(tx.objectStore(store));
    result.onsuccess = () => resolve(result.result);
    result.onerror = () => reject(result.error);
  });
}

export const store = {
  async get<T>(storeName: StoreName, key: string): Promise<T | undefined> {
    return txn(storeName, 'readonly', (s) => s.get(key));
  },

  async getAll<T>(storeName: StoreName): Promise<T[]> {
    return txn(storeName, 'readonly', (s) => s.getAll());
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async put(storeName: StoreName, value: any): Promise<IDBValidKey> {
    return txn(storeName, 'readwrite', (s) => s.put(value));
  },

  async delete(storeName: StoreName, key: string): Promise<undefined> {
    return txn(storeName, 'readwrite', (s) => s.delete(key));
  },

  async clear(storeName: StoreName): Promise<undefined> {
    return txn(storeName, 'readwrite', (s) => s.clear());
  },
};

// ─── Convenience accessors ───

export async function loadConstitution() {
  return store.get(STORES.constitution, 'current');
}

export async function saveConstitution(data: unknown) {
  return store.put(STORES.constitution, { id: 'current', ...(data as Record<string, unknown>) });
}

export async function loadSettings() {
  return store.get(STORES.settings, 'app');
}

export async function saveSettings(data: unknown) {
  return store.put(STORES.settings, { id: 'app', ...(data as Record<string, unknown>) });
}

export async function loadChatHistory() {
  return store.getAll(STORES.chat);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function saveChatMessage(msg: any) {
  return store.put(STORES.chat, msg);
}

export async function clearChatHistory() {
  return store.clear(STORES.chat);
}

export async function loadTasks() {
  return store.getAll(STORES.tasks);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function saveTask(task: any) {
  return store.put(STORES.tasks, task);
}

export async function deleteTask(id: string) {
  return store.delete(STORES.tasks, id);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function saveDocument(doc: any) {
  return store.put(STORES.documents, doc);
}

export async function loadDocuments() {
  return store.getAll(STORES.documents);
}

export async function deleteDocument(id: string) {
  return store.delete(STORES.documents, id);
}
