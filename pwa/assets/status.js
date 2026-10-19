// Decision codes are independent of translated labels. English status fields
// remain a compatibility boundary for existing logs and old preview exports.
export const STATUS_DEFINITIONS = Object.freeze({
  ready: ["OK", "ok"], done: ["Done", "done"], undone: ["Undone", "done"],
  excluded: ["Excluded", "excluded"], partial: ["Partial", "partial"],
  cancelled: ["Cancelled", "warn"], binding: ["Binding required", "warn"],
  filesystem: ["Filesystem unknown", "warn"], pending: ["Needs check", "warn"],
  csv: ["CSV invalid", "error"], duplicate: ["Duplicate target", "warn"],
  occupied: ["Target exists", "warn"], invalid: ["Invalid filename", "warn"],
  reserved: ["Reserved name", "warn"], trailing: ["Trailing dot or space", "warn"],
  unchanged: ["No change", "warn"], emptyName: ["Target name empty", "warn"],
  caseOnly: ["Case-only unsupported", "warn"],
  emptyFolder: ["Target folder empty", "warn"], sourceFolder: ["Source folder only", "warn"],
  preview: ["Preview only", "warn"], outputPermission: ["Output permission needed", "warn"],
  failed: ["Error", "error"], unknown: ["Unknown", "warn"]
});
const LABEL_CODES = new Map(Object.entries(STATUS_DEFINITIONS).map(([code, [label]]) => [label, code]));
export function normalizeRowStatus(row) {
  const text = String(row.status || "");
  return { ...row, statusCode: text.startsWith("Error:") ? "failed" : LABEL_CODES.get(text) || "unknown" };
}
export function statusCode(row) {
  return row && Object.hasOwn(STATUS_DEFINITIONS, row.statusCode) ? row.statusCode : normalizeRowStatus(row || {}).statusCode;
}
export function statusBucket(row) { return STATUS_DEFINITIONS[statusCode(row)][1]; }
export function isReady(row) { return statusCode(row) === "ready"; }
export function statusLabel(row) { return STATUS_DEFINITIONS[statusCode(row)][0]; }
