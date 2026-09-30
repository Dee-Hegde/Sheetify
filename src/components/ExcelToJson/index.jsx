import React, { useCallback, useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { cleanAndConvertFromRows } from "../../utils/dataCleaner";
import "./excelToJson.scss";

const SAMPLE_ROWS = [
  ["id", "name", "team", "salary", "active", "city"],
  [1, "Asha Rao", "Design", 72000, true, "Mumbai"],
  [2, "Vikram Shah", "Engineering", 98000, true, "Bengaluru"],
  [3, "Meera Iyer", "Product", 88000, false, "Chennai"],
  [4, "Rahul Nair", "Engineering", 91000, true, "Kochi"],
];
const SAMPLE_JSON_DATA = cleanAndConvertFromRows(SAMPLE_ROWS);

const toColumnLabel = (index) => {
  let value = index + 1;
  let label = "";
  while (value > 0) {
    value -= 1;
    label = String.fromCharCode(65 + (value % 26)) + label;
    value = Math.floor(value / 26);
  }
  return label;
};

const renderJsonTokens = (value) => {
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

const ExcelToJsonConverter = () => {
  const fileInputRef = useRef(null);
  const jsonOutputRef = useRef(null);
  const gutterRef = useRef(null);
  const [sheetNames, setSheetNames] = useState(["Sheet1"]);
  const [sheets, setSheets] = useState({ Sheet1: SAMPLE_ROWS });
  const [selectedSheet, setSelectedSheet] = useState("Sheet1");
  const [indentSize, setIndentSize] = useState(2);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("sample_data.xlsx");
  const [feedback, setFeedback] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const rows = sheets[selectedSheet] || [];
  const jsonData = useMemo(() => cleanAndConvertFromRows(rows), [rows]);
  const jsonText = useMemo(
    () => JSON.stringify(jsonData, null, indentSize),
    [indentSize, jsonData],
  );
  const columns = useMemo(
    () =>
      Array.from(
        { length: Math.max(...rows.map((row) => row.length), 0) },
        (_, index) => index,
      ),
    [rows],
  );
  const lineNumbers = useMemo(
    () =>
      Array.from(
        { length: Math.max(jsonText.split(/\r\n|\r|\n/).length, 1) },
        (_, index) => index + 1,
      ),
    [jsonText],
  );
  const hasData = useMemo(
    () => Array.isArray(jsonData) && jsonData.length > 0,
    [jsonData],
  );
  const statusText =
    error ||
    feedback ||
    (hasData
      ? `Converted ${jsonData.length} rows and ${Object.keys(jsonData[0]).length} columns to JSON`
      : "Upload or drop a CSV or Excel file to get started");

  const parseCsvRows = useCallback((text) => {
    const result = Papa.parse(text, {
      header: false,
      skipEmptyLines: "greedy",
    });
    if (result.errors && result.errors.length) {
      const firstError = result.errors[0];
      throw new Error(firstError.message || "Failed to parse CSV");
    }
    return result.data; // 2D array of rows
  }, []);

  const parseExcelSheets = useCallback((arrayBuffer) => {
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    if (!workbook.SheetNames.length) {
      throw new Error("No sheets found in Excel file");
    }
    return {
      names: workbook.SheetNames,
      data: Object.fromEntries(
        workbook.SheetNames.map((name) => [
          name,
          XLSX.utils.sheet_to_json(workbook.Sheets[name], {
            header: 1,
            defval: null,
            blankrows: false,
          }),
        ]),
      ),
    };
  }, []);

  const processFile = useCallback(
    async (file) => {
      setError("");
      setFeedback("");
      if (!file) return;
      setSheetNames([]);
      setSheets({});
      setSelectedSheet("");
      setFileName(file.name);
      const ext = file.name.toLowerCase().split(".").pop();
      setIsLoading(true);
      try {
        if (ext === "csv") {
          const text = await file.text();
          const rows = parseCsvRows(text);
          setSheetNames(["Sheet1"]);
          setSheets({ Sheet1: rows });
          setSelectedSheet("Sheet1");
        } else if (ext === "xlsx" || ext === "xls") {
          const buffer = await file.arrayBuffer();
          const workbook = parseExcelSheets(buffer);
          setSheetNames(workbook.names);
          setSheets(workbook.data);
          setSelectedSheet(workbook.names[0]);
        } else {
          throw new Error("Unsupported file type. Please upload CSV or Excel.");
        }
        setFeedback("");
      } catch (e) {
        setError(e.message || "Failed to parse file");
      } finally {
        setIsLoading(false);
      }
    },
    [parseCsvRows, parseExcelSheets],
  );

  const handleFileChange = useCallback(
    async (evt) => {
      const file = evt.target.files && evt.target.files[0];
      await processFile(file);
      evt.target.value = "";
    },
    [processFile],
  );

  const handleDragOver = useCallback((evt) => {
    evt.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event) => {
    if (event.currentTarget.contains(event.relatedTarget)) return;
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (evt) => {
      evt.preventDefault();
      setIsDragging(false);
      const file = evt.dataTransfer?.files?.[0];
      if (file) {
        await processFile(file);
      }
    },
    [processFile],
  );

  const handleCopy = useCallback(async () => {
    try {
      if (!hasData) return;
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(jsonText);
      } else {
        const temporaryInput = document.createElement("textarea");
        temporaryInput.value = jsonText;
        temporaryInput.setAttribute("readonly", "");
        temporaryInput.style.position = "fixed";
        temporaryInput.style.left = "-9999px";
        document.body.appendChild(temporaryInput);
        temporaryInput.select();
        document.execCommand("copy");
        document.body.removeChild(temporaryInput);
      }
      setFeedback("JSON copied to clipboard");
    } catch (e) {
      setError("Failed to copy to clipboard");
    }
  }, [hasData, jsonText]);

  const handleDownload = useCallback(() => {
    if (!hasData) {
      return;
    }

    try {
      const safeFileName = fileName
        ? fileName.replace(/\.[^/.]+$/, "") + ".json"
        : "converted-data.json";
      const blob = new Blob([jsonText], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      anchor.href = url;
      anchor.download = safeFileName;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setFeedback(`${safeFileName} downloaded`);
    } catch (e) {
      setError("Failed to download JSON file");
    }
  }, [fileName, hasData, jsonText]);

  const handleClear = useCallback(() => {
    setSheetNames([]);
    setSheets({});
    setSelectedSheet("");
    setError("");
    setFileName("");
    setFeedback("");
    setIsDragging(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const syncOutputScroll = useCallback(() => {
    if (gutterRef.current && jsonOutputRef.current) {
      gutterRef.current.scrollTop = jsonOutputRef.current.scrollTop;
    }
  }, []);

  return (
    <div className="excel-to-json">
      <header className="excel-to-json-heading">
        <h1>Excel to JSON</h1>
        <p>
          Upload or drag and drop a CSV or Excel file to convert it to JSON and
          copy it.
        </p>
      </header>

      <main className="excel-to-json-card">
        <div className="excel-to-json-toolbar">
          <input
            ref={fileInputRef}
            aria-label="Upload CSV or Excel file"
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileChange}
            hidden
          />
          <div
            className={`excel-file-drop ${isDragging ? "dragging" : ""}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
            >
              <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M4 16v4h16v-4" />
            </svg>
            <span>
              {isDragging
                ? "Drop your file here"
                : "Drop a CSV or Excel file here, or"}
            </span>
            <button
              type="button"
              className="browse-button"
              onClick={() => fileInputRef.current?.click()}
            >
              browse
            </button>
            {fileName && <span className="selected-file">{fileName}</span>}
          </div>
          <button
            type="button"
            className="toolbar-button clear-button"
            onClick={handleClear}
            disabled={isLoading}
          >
            Clear
          </button>
        </div>

        <div className="excel-to-json-panes">
          <section
            className="excel-pane spreadsheet-pane"
            aria-label="Spreadsheet preview"
          >
            <div className="excel-pane-heading">
              <strong>Spreadsheet</strong>
              <span>
                {jsonData.length} rows x {columns.length} columns
              </span>
            </div>
            <div className="spreadsheet-scroll">
              {rows.length ? (
                <table className="spreadsheet-table">
                  <thead>
                    <tr className="column-letters">
                      <th className="row-header" />
                      {columns.map((column) => (
                        <th key={column}>{toColumnLabel(column)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        <th className="row-header">{rowIndex + 1}</th>
                        {columns.map((column) => (
                          <td
                            key={column}
                            className={rowIndex === 0 ? "header-cell" : ""}
                          >
                            {row[column] == null ? "" : String(row[column])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="spreadsheet-empty">
                  Spreadsheet preview appears here
                </div>
              )}
            </div>
          </section>

          <section
            className="excel-pane json-output-pane"
            aria-label="JSON output"
          >
            <div className="excel-pane-heading">
              <strong>JSON output</strong>
              <span>Parsed JSON appears here</span>
              <div className="output-actions">
                <button
                  type="button"
                  className="output-icon-button"
                  onClick={handleCopy}
                  disabled={!hasData}
                  aria-label="Copy JSON"
                  title="Copy JSON"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                  >
                    <path d="M16 1H4a2 2 0 0 0-2 2v12h2V3h12V1Zm4 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 16H8V7h12V7Z" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="output-icon-button"
                  onClick={handleDownload}
                  disabled={!hasData}
                  aria-label="Download JSON"
                  title="Download JSON"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5M4 17v4h16v-4" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="json-result-editor">
              <div
                className="json-result-gutter"
                ref={gutterRef}
                aria-hidden="true"
              >
                {lineNumbers.map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </div>
              <pre
                ref={jsonOutputRef}
                onScroll={syncOutputScroll}
                className="json-result"
                aria-label="Converted JSON output"
              >
                {hasData ? (
                  renderJsonTokens(jsonText)
                ) : (
                  <span className="output-placeholder">
                    Parsed JSON appears here
                  </span>
                )}
              </pre>
            </div>
          </section>
        </div>

        <div
          className={`excel-to-json-status ${error ? "status-error" : ""}`}
          role={error ? "alert" : "status"}
          aria-live="polite"
        >
          <span className="status-indicator" />
          <span>{isLoading ? "Reading file..." : statusText}</span>
        </div>
      </main>
    </div>
  );
};

export default ExcelToJsonConverter;
