// Execution owns immutable plans and append-only stage journals. No DOM/global
// UI state is read after planning. Recovery never discards unresolved records.
import { codedError, validateRows } from "./rules.js";
import {
  assertAbsent, assertFile, createDirectoryRegistry, ensurePermission,
  fileExists, fingerprint, getSourceFile, sameEntry
} from "./filesystem.js";

const now = () => new Date().toISOString();
const record = (entry, stage, detail = "") => {
  entry.events.push({ stage, timestamp: now(), detail });
  entry.stage = stage;
};

export async function createExecutionPlan(rows, { controlled = false } = {}) {
  const identity = createDirectoryRegistry();
  const items = [];
  for (const row of rows.filter((candidate) => candidate.status === "OK")) {
    if (!["Rename", "Copy"].includes(row.action) || !row.sourceRef || !row.targetDirectory) {
      throw codedError("bindingRequired", "Bind this row to real source and target handles before execution.");
    }
    const directoryKey = await identity(row.targetDirectory);
    if (row.targetFolder !== row.targetDirectory.name) throw codedError("bindingRequired", "Displayed target does not match its bound directory.");
    if (row.action === "Rename" && !await sameEntry(row.sourceRef.directoryHandle, row.targetDirectory)) {
      throw codedError("renameSourceOnly", "Direct rename only supports the selected source folder.");
    }
    const sourceFile = await getSourceFile(row.sourceRef);
    const sourceFingerprint = await fingerprint(sourceFile);
    const item = Object.freeze({
      id: row.id, action: row.action,
      sourceName: row.sourceName, sourcePath: row.sourcePath,
      targetName: row.targetName, targetFolder: row.targetDirectory.name,
      targetPath: `${row.targetDirectory.name}/${row.targetName}`,
      targetDirectory: row.targetDirectory, targetDirectoryKey: directoryKey,
      sourceRef: Object.freeze({ ...row.sourceRef }), sourceFingerprint,
      status: "OK"
    });
    if (item.sourceRef.directoryHandle) {
      await assertFile(item.sourceRef.directoryHandle, item.sourceName, item.sourceRef.fileHandle, sourceFingerprint);
    }
    await assertAbsent(item.targetDirectory, item.targetName);
    items.push(item);
  }
  // Resolve actual directory identity BEFORE duplicate validation, including
  // different handle objects for the same directory and misleading labels.
  if (validateRows(items).some((item) => item.status !== "OK")) {
    throw codedError("targetOccupied", "Execution plan contains conflicting targets.");
  }
  return Object.freeze({ id: crypto.randomUUID(), createdAt: now(), controlled, items: Object.freeze(items) });
}

export function createBatch(plan) {
  return {
    id: plan.id, createdAt: plan.createdAt, state: "ready", cancelRequested: false,
    entries: plan.items.map((item) => ({
      item, state: "ready", stage: "planned", events: [],
      targetHandle: null, targetFingerprint: null, sourceDeleted: false, sourceDeletion: "not-started",
      undo: "pending", error: null, undoCreatedHandle: null, undoCreatedFingerprint: null
    }))
  };
}

async function assertSource(item) {
  if (item.sourceRef.directoryHandle) {
    return assertFile(item.sourceRef.directoryHandle, item.sourceName, item.sourceRef.fileHandle, item.sourceFingerprint);
  }
  const file = await getSourceFile(item.sourceRef);
  const actual = await fingerprint(file);
  if (actual.sha256 !== item.sourceFingerprint.sha256 || actual.modified !== item.sourceFingerprint.modified) {
    throw codedError("fileChanged", "Template changed since confirmation.");
  }
  return file;
}

async function writeNew(directory, name, file, entry, prefix = "") {
  let stream;
  try {
    record(entry, `${prefix}checking-target`);
    await assertAbsent(directory, name);
    record(entry, `${prefix}creating-target`);
    const handle = await directory.getFileHandle(name, { create: true });
    if (prefix) entry.undoCreatedHandle = handle;
    else entry.targetHandle = handle;
    const empty = await handle.getFile();
    if (empty.size !== 0) throw codedError("targetOccupied", "Target appeared while creating it; writing was stopped.");
    // Keep evidence even when open/write/close fails. Never blindly delete a
    // partially written target; recovery checks its handle AND fingerprint.
    if (prefix) {
      entry.undoCreatedHandle = handle;
      entry.undoCreatedFingerprint = await fingerprint(empty);
    } else {
      entry.targetHandle = handle;
      entry.targetFingerprint = await fingerprint(empty);
    }
    record(entry, `${prefix}created-target`);
    stream = await handle.createWritable();
    record(entry, `${prefix}writing`);
    await stream.write(file);
    record(entry, `${prefix}closing`);
    await stream.close();
    stream = null;
    record(entry, `${prefix}closed`);
    const written = await handle.getFile();
    const actual = await fingerprint(written);
    const expected = await fingerprint(file);
    if (actual.size !== expected.size || actual.sha256 !== expected.sha256) {
      throw codedError("verificationFailed", "Written content could not be verified; source retained.");
    }
    if (prefix) entry.undoCreatedFingerprint = actual;
    else entry.targetFingerprint = actual;
    record(entry, `${prefix}verified-target`);
    return handle;
  } catch (error) {
    if (stream) {
      try { await stream.abort(); record(entry, `${prefix}aborted-write`); }
      catch (abortError) { record(entry, `${prefix}abort-failed`, abortError.message); }
    }
    throw error;
  }
}

export async function runBatch(plan, batch = createBatch(plan), onProgress = () => {}) {
  if (batch.state !== "ready") throw codedError("batchBusy", "Batch has already started.");
  batch.state = "executing";
  for (const entry of batch.entries) {
    if (batch.cancelRequested) { entry.state = "cancelled"; record(entry, "cancelled"); onProgress(entry, batch); continue; }
    const item = entry.item;
    try {
      if (!plan.controlled) throw codedError("strictWritesUnavailable", "Strict no-overwrite execution is unavailable in this browser.");
      await ensurePermission(item.targetDirectory);
      record(entry, "reading-source");
      const file = await assertSource(item);
      await writeNew(item.targetDirectory, item.targetName, file, entry);
      if (item.action === "Rename") {
        record(entry, "checking-source-before-delete");
        await assertSource(item);
        await assertFile(item.targetDirectory, item.targetName, entry.targetHandle, entry.targetFingerprint);
        record(entry, "deleting-source");
        entry.sourceDeletion = "unknown";
        await item.sourceRef.directoryHandle.removeEntry(item.sourceName);
        entry.sourceDeleted = true;
        entry.sourceDeletion = "confirmed";
        record(entry, "deleted-source");
      }
      entry.state = "completed";
      record(entry, "completed");
    } catch (error) {
      entry.error = { code: error.code || error.name, message: error.message };
      entry.state = entry.targetHandle ? "partial" : "failed";
      record(entry, entry.state, error.message);
    }
    onProgress(entry, batch);
  }
  const completed = batch.entries.filter((entry) => entry.state === "completed").length;
  batch.state = batch.cancelRequested ? "cancelled" : completed === batch.entries.length ? "completed"
    : batch.entries.some((entry) => entry.targetHandle) ? "partial" : "failed";
  return batch;
}

export function recoverableEntries(batch) {
  return batch?.entries.filter((entry) => entry.targetHandle && entry.undo !== "completed") || [];
}

export async function undoBatch(batch, { controlled = false, onProgress = () => {} } = {}) {
  if (["executing", "undoing"].includes(batch.state)) throw codedError("batchBusy", "Batch is still running.");
  batch.state = "undoing";
  for (const entry of recoverableEntries(batch).reverse()) {
    const item = entry.item;
    try {
      if (!controlled) throw codedError("strictWritesUnavailable", "Strict no-overwrite recovery is unavailable in this browser.");
      await ensurePermission(item.targetDirectory);
      record(entry, "undo-checking-target");
      const file = await assertFile(item.targetDirectory, item.targetName, entry.targetHandle, entry.targetFingerprint);
      if (item.action === "Rename" && entry.sourceDeletion === "unknown" && !await fileExists(item.targetDirectory, item.sourceName)) {
        entry.sourceDeleted = true;
        record(entry, "undo-confirmed-source-missing");
      }
      if (item.action === "Rename" && entry.sourceDeleted) {
        if (entry.undoCreatedHandle) {
          // Retry after a completed restoration but failed deletion: recognize
          // only the file this undo created; an external original always blocks.
          await assertFile(item.targetDirectory, item.sourceName, entry.undoCreatedHandle, entry.undoCreatedFingerprint);
          if (entry.undoCreatedFingerprint.sha256 !== item.sourceFingerprint.sha256) {
            // A failed write may leave the empty file we created. Its exact
            // identity/fingerprint was checked above, so it can be retried.
            if (entry.undoCreatedFingerprint.size !== 0) {
              throw codedError("verificationFailed", "Previous restoration is incomplete; manual recovery required.");
            }
            await item.targetDirectory.removeEntry(item.sourceName);
            entry.undoCreatedHandle = null;
            entry.undoCreatedFingerprint = null;
            await writeNew(item.targetDirectory, item.sourceName, file, entry, "undo-");
          }
        } else {
          await writeNew(item.targetDirectory, item.sourceName, file, entry, "undo-");
        }
      } else if (item.action === "Rename") {
        // Forward delete failed. Remove the duplicate only if the original is
        // still the exact source confirmed for this batch.
        await assertSource(item);
      }
      await assertFile(item.targetDirectory, item.targetName, entry.targetHandle, entry.targetFingerprint);
      record(entry, "undo-deleting-target");
      await item.targetDirectory.removeEntry(item.targetName);
      entry.undo = "completed";
      entry.undoError = null;
      record(entry, "undo-completed");
    } catch (error) {
      entry.undo = "unresolved";
      entry.undoError = { code: error.code || error.name, message: error.message };
      record(entry, "undo-unresolved", error.message);
    }
    onProgress(entry, batch);
  }
  batch.state = recoverableEntries(batch).length ? "partial" : "undone";
  return batch;
}

// If a later batch moved an earlier batch's output, undo creates a new file
// entry at that name. Rebind only this proven in-memory dependency; never infer
// ownership from a matching filename or display path.
export function reconcileRecoveryDependencies(batches, restoredBatch) {
  for (const restored of restoredBatch.entries) {
    if (restored.undo !== "completed" || !restored.undoCreatedHandle) continue;
    for (const batch of batches) {
      if (batch === restoredBatch) continue;
      for (const entry of recoverableEntries(batch)) {
        if (entry.targetHandle === restored.item.sourceRef.fileHandle
          && entry.targetFingerprint?.sha256 === restored.undoCreatedFingerprint?.sha256) {
          entry.targetHandle = restored.undoCreatedHandle;
          entry.targetFingerprint = restored.undoCreatedFingerprint;
          record(entry, "rebound-after-later-undo", restoredBatch.id);
        }
      }
    }
  }
}

// JSON recovery export deliberately excludes live handles and File contents.
export function recoveryReport(batches) {
  return {
    schemaVersion: 1, exportedAt: now(),
    batches: batches.map((batch) => ({
      id: batch.id, state: batch.state, createdAt: batch.createdAt,
      entries: batch.entries.map((entry) => ({
        source: entry.item.sourcePath, target: entry.item.targetPath,
        action: entry.item.action, state: entry.state, sourceDeleted: entry.sourceDeleted, sourceDeletion: entry.sourceDeletion,
        sourceFingerprint: entry.item.sourceFingerprint, targetFingerprint: entry.targetFingerprint,
        undo: entry.undo, error: entry.error, undoError: entry.undoError || null,
        events: entry.events
      }))
    }))
  };
}
