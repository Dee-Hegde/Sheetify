// Utility to detect the exact data area, discard empty/invalid rows and columns,
// and convert 2D rows to JSON array of objects.

function isEmptyCell(value) {
  return (
    value === null ||
    value === undefined ||
    (typeof value === "string" && value.trim() === "")
  );
}

function countNonEmpty(row) {
  if (!Array.isArray(row)) return 0;
  return row.reduce((acc, v) => acc + (isEmptyCell(v) ? 0 : 1), 0);
}

function getNonEmptyColIndices(rows, startRow = 0, sampleWindow = 50) {
  const colSet = new Set();
  const endRow = Math.min(rows.length, startRow + sampleWindow);
  for (let r = startRow; r < endRow; r++) {
    const row = rows[r] || [];
    for (let c = 0; c < row.length; c++) {
      if (!isEmptyCell(row[c])) colSet.add(c);
    }
  }
  return Array.from(colSet).sort((a, b) => a - b);
}

function chooseHeaderRowIndex(rows) {
  // Choose the row with maximum non-empty cells among the first 100 rows
  let bestIndex = -1;
  let bestCount = -1;
  const limit = Math.min(rows.length, 100);
  for (let i = 0; i < limit; i++) {
    const cnt = countNonEmpty(rows[i]);
    if (cnt > bestCount) {
      bestCount = cnt;
      bestIndex = i;
    }
  }
  return bestIndex;
}

function normalizeHeaders(headerCells) {
  const headers = [];
  const used = new Map();
  for (let i = 0; i < headerCells.length; i++) {
    let raw = headerCells[i];
    let name = isEmptyCell(raw) ? `col_${i + 1}` : String(raw).trim();
    if (name === "") name = `col_${i + 1}`;
    // Deduplicate
    const lower = name.toLowerCase();
    if (!used.has(lower)) {
      used.set(lower, 1);
      headers.push(name);
    } else {
      const next = used.get(lower) + 1;
      used.set(lower, next);
      headers.push(`${name}_${next}`);
    }
  }
  return headers;
}

function cleanAndConvertFromRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return [];

  // Detect header row and likely non-empty columns near it
  const headerRowIndex = chooseHeaderRowIndex(rows);
  if (headerRowIndex < 0) return [];

  const columnCandidates = getNonEmptyColIndices(rows, headerRowIndex, 50);
  if (columnCandidates.length === 0) return [];

  // Build header cells from candidate columns
  const headerRow = rows[headerRowIndex] || [];
  const headerCells = columnCandidates.map((c) => headerRow[c]);
  const headers = normalizeHeaders(headerCells);

  // Determine rowStart and rowEnd boundaries with actual data
  const rowStart = headerRowIndex + 1;
  let rowEnd = rows.length - 1;
  // Trim trailing completely empty rows in candidate columns
  while (rowEnd >= rowStart) {
    const row = rows[rowEnd] || [];
    const nonEmpty = columnCandidates.some((c) => !isEmptyCell(row[c]));
    if (nonEmpty) break;
    rowEnd -= 1;
  }

  // Determine columns actually having data in [rowStart, rowEnd]
  const activeCols = columnCandidates.filter((c) => {
    for (let r = rowStart; r <= rowEnd; r++) {
      const v = (rows[r] || [])[c];
      if (!isEmptyCell(v)) return true;
    }
    return false;
  });
  if (activeCols.length === 0) return [];

  // Adjust headers to activeCols
  const activeHeaders = activeCols.map(
    (c, idx) => headers[columnCandidates.indexOf(c)],
  );

  // Convert rows to objects, skipping rows that are fully empty across active columns
  const out = [];
  for (let r = rowStart; r <= rowEnd; r++) {
    const row = rows[r] || [];
    const hasData = activeCols.some((c) => !isEmptyCell(row[c]));
    if (!hasData) continue;
    const obj = {};
    for (let i = 0; i < activeCols.length; i++) {
      const c = activeCols[i];
      const key = activeHeaders[i];
      let val = row[c];
      if (typeof val === "string") {
        const trimmed = val.trim();
        val = trimmed === "" ? null : trimmed;
      }
      if (val === undefined) val = null;
      obj[key] = val;
    }
    out.push(obj);
  }

  return out;
}

export { cleanAndConvertFromRows };

export const SAMPLE_ROWS = [
  ["id", "name", "team", "salary", "active", "city"],
  [1, "Asha Rao", "Design", 72000, true, "Mumbai"],
  [2, "Vikram Shah", "Engineering", 98000, true, "Bengaluru"],
  [3, "Meera Iyer", "Product", 88000, false, "Chennai"],
  [4, "Rahul Nair", "Engineering", 91000, true, "Kochi"],
];

export const toColumnLabel = (index) => {
  let value = index + 1;
  let label = "";
  while (value > 0) {
    value -= 1;
    label = String.fromCharCode(65 + (value % 26)) + label;
    value = Math.floor(value / 26);
  }
  return label;
};

export const renderJsonTokens = (value) => {
  const tokenPattern =
    /"(?:\\.|[^"\\])*"|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|\b(?:true|false|null)\b/g;
  const parts = [];
  let lastIndex = 0;

  for (const match of value.matchAll(tokenPattern)) {
    const token = match[0];
    const index = match.index;
    const isKey =
      token.startsWith('"') && /^\s*:/.test(value.slice(index + token.length));
    const tokenClass = isKey
      ? "json-token-key"
      : token.startsWith('"')
        ? "json-token-string"
        : /^-?\d/.test(token)
          ? "json-token-number"
          : "json-token-literal";

    if (index > lastIndex) parts.push(value.slice(lastIndex, index));
    parts.push(
      <span
        className={tokenClass}
        key={index}
      >
        {token}
      </span>,
    );
    lastIndex = index + token.length;
  }

  if (lastIndex < value.length) parts.push(value.slice(lastIndex));
  return parts;
};