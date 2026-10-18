// Browser filesystem boundary. Display paths are never used to locate a file.
// getFileHandle({create:true}) is NOT exclusive creation. Strict callers must
// refuse writes; controlled-folder mode explicitly accepts that platform limit.
import { codedError } from "./rules.js";

export async function fileExists(directory, name) {
  try {
    await directory.getFileHandle(name, { create: false });
    return true;
  } catch (error) {
    if (error.name === "NotFoundError") return false;
    throw error;
  }
}

export async function ensurePermission(handle, mode = "readwrite") {
  if (!handle?.queryPermission || !handle?.requestPermission) {
    throw codedError("identityUnavailable", "Cannot verify filesystem permission.");
  }
  if (await handle.queryPermission({ mode }) === "granted") return;
  if (await handle.requestPermission({ mode }) !== "granted") {
    throw codedError("permissionDenied", "File permission was not granted.");
  }
}

export async function sameEntry(left, right) {
  if (!left?.isSameEntry || !right) return false;
  return left.isSameEntry(right);
}

export function createDirectoryRegistry() {
  const entries = [];
  return async (handle) => {
    for (const entry of entries) {
      if (await sameEntry(entry.handle, handle)) return entry.id;
    }
    if (!handle?.isSameEntry) throw codedError("identityUnavailable", "Cannot verify directory identity.");
    const id = `directory-${entries.length}`;
    entries.push({ handle, id });
    return id;
  };
}

export async function fingerprint(file) {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Object.freeze({
    size: file.size,
    modified: file.lastModified,
    sha256: Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")
  });
}

export function matchesFingerprint(left, right) {
  return Boolean(left && right && left.size === right.size && left.sha256 === right.sha256 && left.modified === right.modified);
}

export async function getSourceFile(ref) {
  if (ref?.fileHandle) return ref.fileHandle.getFile();
  if (ref?.file) return ref.file;
  throw codedError("sourceFileMissing", "Source file handle is missing.");
}

export async function assertFile(directory, name, handle, expected) {
  const current = await directory.getFileHandle(name, { create: false });
  if (!await sameEntry(current, handle)) throw codedError("fileChanged", "File identity changed; no files were overwritten.");
  const file = await current.getFile();
  if (!matchesFingerprint(await fingerprint(file), expected)) {
    throw codedError("fileChanged", "File content or metadata changed; manual review is required.");
  }
  return file;
}

export async function assertAbsent(directory, name) {
  if (await fileExists(directory, name)) throw codedError("targetOccupied", "Target name is already occupied; no overwrite attempted.");
}

// A cooperative lock prevents overlapping writes in this origin's tabs. It does
// not lock out Explorer, other applications, or a different browser profile.
export async function withWriteLock(callback) {
  if (!globalThis.navigator?.locks) throw codedError("lockUnavailable", "Browser cannot coordinate file operations across tabs.");
  return navigator.locks.request("batch-file-renamer:file-writes", { ifAvailable: true }, async (lock) => {
    if (!lock) throw codedError("batchBusy", "Another tab is executing or undoing a batch.");
    return callback();
  });
}
