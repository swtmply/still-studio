let databasePromise;

export function openDatabase() {
  databasePromise ??= new Promise((resolve, reject) => {
    const request = indexedDB.open('still-studio', 2);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains('strips')) request.result.createObjectStore('strips', { keyPath: 'id' });
      if (!request.result.objectStoreNames.contains('draft')) request.result.createObjectStore('draft');
    };
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Close other Still Studio tabs, then reload to update local storage.'));
  });
  return databasePromise;
}

export async function readDraft() {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = database.transaction('draft').objectStore('draft').get('current');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveDraft(session) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction('draft', 'readwrite');
    transaction.objectStore('draft').put(session, 'current');
    transaction.oncomplete = resolve;
    transaction.onabort = () => reject(transaction.error);
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function storeStrip(record) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction('strips', 'readwrite');
    transaction.objectStore('strips').put(record);
    transaction.oncomplete = resolve;
    transaction.onabort = () => reject(transaction.error);
    transaction.onerror = () => reject(transaction.error);
  });
}
