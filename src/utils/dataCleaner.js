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
    (c, idx) => headers[columnCandidates.indexOf(c)]
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
