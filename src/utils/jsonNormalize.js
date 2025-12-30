// Normalize various JSON shapes into an array of objects ready for Excel export
// Supports arrays of plain objects and arrays of arrays (with optional header row).

function ensureObjectsFromJson(data) {
  if (!Array.isArray(data) || data.length === 0) return [];
  const first = data[0];
  const isPlainObject = (v) => v && typeof v === "object" && !Array.isArray(v);

  if (isPlainObject(first)) {
    const keySet = new Set();
    for (const row of data) {
      if (isPlainObject(row)) {
        Object.keys(row).forEach((k) => keySet.add(k));
      }
    }
    const keys = Array.from(keySet);
    return data
      .filter((row) => isPlainObject(row))
      .map((row) => {
        const obj = {};
        for (const k of keys) {
          let v = row[k];
          if (v === undefined) v = null;
          obj[k] = v;
        }
        return obj;
      });
  }

  if (data.every((r) => Array.isArray(r))) {
    const maxLen = Math.max(...data.map((r) => r.length));
    const firstRow = data[0] || [];
    const rowLooksHeader =
      firstRow.length > 0 && firstRow.every((v) => typeof v === "string");
    const headers = Array.from({ length: maxLen }, (_, i) => {
      const head = rowLooksHeader ? String(firstRow[i] || "").trim() : "";
      return head !== "" ? head : `col_${i + 1}`;
    });
    const startIndex = rowLooksHeader ? 1 : 0;
    const body = data.slice(startIndex);
    return body.map((row) => {
      const obj = {};
      for (let i = 0; i < headers.length; i++) {
        let v = row[i];
        if (v === undefined) v = null;
        obj[headers[i]] = v;
      }
      return obj;
    });
  }

  return [];
}

export { ensureObjectsFromJson };

// Convert snake_case or underscored headers to PascalCase by
// removing underscores and capitalizing the next letter; also
// capitalize the first letter.
function normalizeHeaderLabel(h) {
  if (typeof h !== "string") h = String(h ?? "");
  const trimmed = h.trim();
  if (trimmed === "") return "";
  let out = "";
  let capitalizeNext = true; // capitalize the first character
  let pendingSpace = false; // insert single space when leaving separator run
  const isSeparator = (ch) =>
    ch === "_" || ch === " " || ch === "," || ch === ".";
  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (isSeparator(ch)) {
      // set flags but don't output separator; collapse multiple to single space
      capitalizeNext = true; // next non-separator becomes uppercase
      pendingSpace = out.length > 0; // avoid leading space
      continue;
    }
    if (pendingSpace) {
      // insert one space before next word
      out += " ";
      pendingSpace = false;
    }
    out += capitalizeNext ? ch.toUpperCase() : ch;
    capitalizeNext = false;
  }
  return out;
}

// Given an array of objects, return a new array where keys are normalized
// with `normalizeHeaderLabel`. Ensures uniqueness by suffixing _2, _3 when needed.
function normalizeExcelHeaders(data) {
  if (!Array.isArray(data)) return [];
  const keyMap = new Map(); // original -> normalized
  const used = new Map(); // normalizedLower -> count

  // Build map across all keys
  for (const row of data) {
    if (!row || typeof row !== "object" || Array.isArray(row)) continue;
    for (const k of Object.keys(row)) {
      if (keyMap.has(k)) continue;
      let nk = normalizeHeaderLabel(k);
      const lower = nk.toLowerCase();
      if (!used.has(lower)) {
        used.set(lower, 1);
      } else {
        const cnt = used.get(lower) + 1;
        used.set(lower, cnt);
        nk = `${nk}_${cnt}`;
      }
      keyMap.set(k, nk);
    }
  }

  // Remap rows
  return data.map((row) => {
    const obj = {};
    if (!row || typeof row !== "object" || Array.isArray(row)) return obj;
    for (const k of Object.keys(row)) {
      const nk = keyMap.get(k) || k;
      obj[nk] = row[k];
    }
    return obj;
  });
}

export { normalizeHeaderLabel, normalizeExcelHeaders };
