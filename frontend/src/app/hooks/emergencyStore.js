// src/lib/emergencyStore.js
"use client";

const STORAGE_KEY = "emergency_admissions_v1";
const listeners = new Set();
let cachedSnapshot = [];
let cachedRaw = null;

function load() {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) return cachedSnapshot;
  cachedRaw = raw;
  try {
    cachedSnapshot = raw ? JSON.parse(raw) : [];
  } catch {
    cachedSnapshot = [];
  }
  return cachedSnapshot;
}

function persist(list) {
  if (typeof window === "undefined") return;
  const raw = JSON.stringify(list);
  cachedRaw = raw;
  cachedSnapshot = list;
  localStorage.setItem(STORAGE_KEY, raw);
  listeners.forEach((fn) => fn());
}

export function subscribe(listener) {
  listeners.add(listener);
  const onStorage = (e) => {
    if (e.key === STORAGE_KEY) {
      cachedRaw = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function getSnapshot() {
  return load();
}

// Backwards-compatible alias. Must share identity with getSnapshot so
// useSyncExternalStore doesn't loop. Do NOT wrap in a new function.
export const getAdmissions = getSnapshot;

export function addAdmission(data) {
  const record = {
    id: `EMG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    ...data,
    status: "waiting",
    createdAt: new Date().toISOString(),
  };
  persist([record, ...load()]);
  return record;
}

export function updateAdmissionStatus(id, status) {
  persist(load().map((r) => (r.id === id ? { ...r, status } : r)));
}

export function removeAdmission(id) {
  persist(load().filter((r) => r.id !== id));
}