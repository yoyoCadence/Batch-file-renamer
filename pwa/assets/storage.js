// Accessing localStorage itself may throw (not only getItem/setItem). Resolve
// the optional backend inside the protected call, never in a default argument.
let persistenceFailed = false;

export function storageAvailable() { return !persistenceFailed; }

export function readJson(storage, key, fallback) {
  let raw;
  try {
    const backend = storage === undefined ? globalThis.localStorage : storage;
    if (!backend) return fallback;
    raw = backend.getItem(key);
  } catch {
    persistenceFailed = true;
    return fallback;
  }
  try { return raw ? JSON.parse(raw) : fallback; }
  catch { return fallback; }
}

export function writeJson(storage, key, value) {
  try {
    const backend = storage === undefined ? globalThis.localStorage : storage;
    if (!backend) { persistenceFailed = true; return false; }
    backend.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    persistenceFailed = true;
    return false;
  }
}
