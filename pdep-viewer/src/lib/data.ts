import { createSignal } from "solid-js";

export type PrepDef = {
  prep: string;
  sense: string;
  def: string;
};

export type PrepProp = {
  prep: string;
  sense: string;
  cprop: string;
  aprop: string;
  sup: string;
  srtype: string;
  tratz: string | null;
  srikumar: string | null;
  opreps: string | null;
  srel: string | null;
  qsyn: string | null;
  qpar: string | null;
  com: string | null;
  cnn: number | null;
  cnnp: number | null;
  cwh: number | null;
  cing: number | null;
  clexset: string | null;
  gnoun: number | null;
  gverb: number | null;
  gadj: number | null;
  csel: string | null;
  gsel: string | null;
  conto: string | null;
  ssense: string | null;
  clanal: number | null;
  subc: string;
};

export type PrepCorp = {
  prep: string;
  source: string;
  sense: string;
  inst: number;
  preploc: number;
  sentence: string;
};

type DataStore = {
  preps: string[];
  prepdefs: PrepDef[];
  prepprops: PrepProp[];
  prepcorp: PrepCorp[];
};

// Cached data store
let dataStore: DataStore | null = null;
let dataPromise: Promise<DataStore> | null = null;

const [isLoading, setIsLoading] = createSignal(false);
const [isLoaded, setIsLoaded] = createSignal(false);
const [loadProgress, setLoadProgress] = createSignal(0);

export { isLoading, isLoaded, loadProgress };

const DB_NAME = "pdep-cache";
const STORE_NAME = "data";
const CACHE_KEY = "pdep-data";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
  });
}

async function getFromIndexedDB(): Promise<DataStore | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(CACHE_KEY);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result ?? null);
    });
  } catch {
    return null;
  }
}

async function saveToIndexedDB(data: DataStore): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(data, CACHE_KEY);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch {
    // Ignore cache errors
  }
}

async function fetchWithProgress(): Promise<DataStore> {
  const response = await fetch("/data.json");
  const contentLength = response.headers.get("content-length");
  const total = contentLength ? parseInt(contentLength, 10) : 0;

  if (!response.body || !total) {
    // Fallback if streaming not supported or no content-length
    const data = await response.json();
    setLoadProgress(1);
    return data;
  }

  const reader = response.body.getReader();
  const chunks: BlobPart[] = [];
  let receivedLength = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    chunks.push(value);
    receivedLength += value.length;
    setLoadProgress(receivedLength / total);
  }

  const blob = new Blob(chunks);
  const text = await blob.text();
  return JSON.parse(text);
}

export async function loadData(): Promise<DataStore> {
  if (dataStore) return dataStore;
  if (dataPromise) return dataPromise;

  dataPromise = (async () => {
    // Check cache first
    const cached = await getFromIndexedDB();
    if (cached) {
      dataStore = cached;
      setLoadProgress(1);
      setIsLoading(false);
      setIsLoaded(true);
      return cached;
    }

    // Fetch with progress
    setIsLoading(true);
    const data = await fetchWithProgress();
    dataStore = data;

    // Save to cache (don't await)
    saveToIndexedDB(data);

    setIsLoading(false);
    setIsLoaded(true);
    return data;
  })();

  return dataPromise;
}

// Synchronous getters (return empty arrays if not loaded yet)
export function getAllPreps(): string[] {
  return dataStore?.preps ?? [];
}

export function getDefsForPrep(prep: string): PrepDef[] {
  if (!dataStore) return [];
  return dataStore.prepdefs.filter((d) => d.prep === prep);
}

export function getPropsForPrep(prep: string): PrepProp[] {
  if (!dataStore) return [];
  return dataStore.prepprops.filter((p) => p.prep === prep);
}

export function getCorpusForPrepSense(prep: string, sense?: string): PrepCorp[] {
  if (!dataStore) return [];
  if (sense) {
    return dataStore.prepcorp.filter((c) => c.prep === prep && c.sense === sense);
  }
  return dataStore.prepcorp.filter((c) => c.prep === prep);
}

export function getPropForSense(prep: string, sense: string): PrepProp | undefined {
  if (!dataStore) return undefined;
  return dataStore.prepprops.find((p) => p.prep === prep && p.sense === sense);
}

export function getDefForSense(prep: string, sense: string): PrepDef | undefined {
  if (!dataStore) return undefined;
  return dataStore.prepdefs.find((d) => d.prep === prep && d.sense === sense);
}

// Stats helpers
export function getSenseCountForPrep(prep: string): number {
  if (!dataStore) return 0;
  return dataStore.prepdefs.filter((d) => d.prep === prep).length;
}

export function getExampleCountForPrep(prep: string): number {
  if (!dataStore) return 0;
  return dataStore.prepcorp.filter((c) => c.prep === prep).length;
}

// Quiz helpers
export function getPrepsWithMultipleSenses(): string[] {
  if (!dataStore) return [];
  const counts = new Map<string, number>();
  for (const def of dataStore.prepdefs) {
    counts.set(def.prep, (counts.get(def.prep) || 0) + 1);
  }
  return Array.from(counts.entries())
    .filter(([, count]) => count >= 2)
    .map(([prep]) => prep);
}

export function getRandomCorpusExample(prep: string): PrepCorp | undefined {
  if (!dataStore) return undefined;
  const examples = dataStore.prepcorp.filter(
    (c) => c.prep === prep && c.sense !== ""
  );
  if (examples.length === 0) return undefined;

  // Group by sense
  const bySense = new Map<string, PrepCorp[]>();
  for (const ex of examples) {
    const list = bySense.get(ex.sense) || [];
    list.push(ex);
    bySense.set(ex.sense, list);
  }

  // Pick a random sense first, then a random example from that sense
  const senses = Array.from(bySense.keys());
  const randomSense = senses[Math.floor(Math.random() * senses.length)];
  const sensExamples = bySense.get(randomSense)!;
  return sensExamples[Math.floor(Math.random() * sensExamples.length)];
}
