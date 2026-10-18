// Pure preview state transitions. Overrides and exclusions are keyed by source
// identity, independently of the visible order, scope or search results.
import { joinDisplayPath } from "./rules.js";

export function mergeOverrides(rows, overrides) {
  return rows.map((row) => {
    const override = overrides.get(row.id);
    return override ? {
      ...row, ...override, manual: true, status: "OK", statusDetail: null,
      targetExists: false, filesystemError: null
    } : row;
  });
}

export function attachBindings(rows, { outputDirectory } = {}) {
  return rows.map((row) => {
    if (row.imported && !row.bound) return { ...row, targetDirectory: null };
    const directory = row.action === "Rename" ? row.sourceRef?.directoryHandle : outputDirectory?.handle;
    return {
      ...row,
      targetDirectory: directory || null,
      targetDirectoryKey: row.action === "Rename" ? "source" : "output",
      // Without a real binding the display value remains a proposed CSV path.
      targetFolder: directory?.name || row.targetFolder,
      targetPath: joinDisplayPath(directory?.name || row.targetFolder, row.targetName)
    };
  });
}

// Import is a separate plan. Never silently substitute the current template or
// guess a path from a basename. The user explicitly binds after selecting files.
export function bindImportedRows(rows, { mode, sources, template, outputDirectory }) {
  return rows.map((row) => {
    let source = null;
    let directory = null;
    if (row.action === "Rename" && mode === "rename") {
      const matches = sources.filter((candidate) => candidate.name === row.sourceName && candidate.path === row.sourcePath);
      if (matches.length === 1) {
        source = matches[0];
        directory = source.ref?.directoryHandle;
      }
    } else if (row.action === "Copy" && mode === "copy" && template?.name === row.sourceName && template?.path === row.sourcePath) {
      source = template;
      directory = outputDirectory?.handle;
    }
    if (!source || !directory || row.targetFolder !== directory.name) {
      return { ...row, bound: false, sourceRef: null, targetDirectory: null, bindingError: true };
    }
    return {
      ...row, bound: true, bindingError: false,
      sourceRef: source.ref, sourceKey: source.key,
      targetDirectory: directory, targetDirectoryKey: row.action === "Rename" ? "source" : "output",
      targetFolderKey: row.action === "Rename" ? "source" : "output",
      status: "OK", statusDetail: null, targetExists: false, filesystemError: null
    };
  });
}

export function rowBucket(status) {
  if (status === "Done" || status === "Undone") return "done";
  if (status === "Excluded") return "excluded";
  if (status === "Partial") return "partial";
  if (status === "OK") return "ok";
  if (String(status).startsWith("Error:")) return "error";
  return "warn";
}

export function rowCounts(rows) {
  return rows.reduce((counts, row) => {
    const bucket = rowBucket(row.status);
    if (bucket === "warn" || bucket === "error") {
      counts.blocked++;
      if (bucket === "error") counts.error++;
    } else counts[bucket]++;
    return counts;
  }, { ok: 0, blocked: 0, error: 0, excluded: 0, done: 0, partial: 0 });
}
