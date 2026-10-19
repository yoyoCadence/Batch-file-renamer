// Stable CSV grammar and resource limits; no DOM, storage or filesystem access.
export const CSV_MAX_BYTES = 5 * 1024 * 1024;
export const CSV_MAX_ROWS = 10000;

function invalid(message) {
  const error = new Error(message);
  error.code = "csvInvalid";
  return error;
}

export function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function parseCsvRecords(input) {
  const text = String(input).replace(/^\uFEFF/, "");
  if (new TextEncoder().encode(text).byteLength > CSV_MAX_BYTES) throw invalid("CSV exceeds 5 MiB.");
  const records = [];
  let row = [], cell = "", quoted = false, closed = false;
  const finishCell = () => { row.push(cell); cell = ""; closed = false; };
  const finishRow = () => {
    finishCell();
    if (row.length > 32) throw invalid("CSV exceeds 32 columns.");
    records.push(row); row = [];
    if (records.length > CSV_MAX_ROWS + 1) throw invalid("CSV exceeds 10,000 data rows.");
  };
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') { cell += '"'; index++; }
      else if (char === '"') { quoted = false; closed = true; }
      else cell += char;
    } else if (char === ",") finishCell();
    else if (char === "\r" || char === "\n") {
      finishRow();
      if (char === "\r" && text[index + 1] === "\n") index++;
    } else if (char === '"') {
      if (cell || closed) throw invalid(`Unexpected quote in CSV record ${records.length + 1}.`);
      quoted = true;
    } else {
      if (closed) throw invalid(`Unexpected text after a closing quote in CSV record ${records.length + 1}.`);
      cell += char;
    }
  }
  if (quoted) throw invalid("CSV has an unterminated quoted field.");
  if (cell || row.length || closed) finishRow();
  return records;
}

export function spreadsheetCell(value) {
  const text = String(value ?? "");
  return /^[\s]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text) ? `'${text}` : text;
}
