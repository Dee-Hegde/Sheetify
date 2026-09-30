import React, { useCallback, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  ensureObjectsFromJson,
  normalizeExcelHeaders,
} from "../../utils/jsonNormalize";
import "./jsonToExcel.scss";

const DEFAULT_FILE_NAME = "sheetify_export";
const SAMPLE_ROWS = [
  {
    id: 1,
    name: "Asha Rao",
    team: "Design",
    salary: 72000,
    active: true,
    city: "Mumbai",
  },
  {
    id: 2,
    name: "Vikram Shah",
    team: "Engineering",
    salary: 98000,
    active: true,
    city: "Bengaluru",
  },
  {
    id: 3,
    name: "Meera Iyer",
    team: "Product",
    salary: 88000,
    active: false,
    city: "Chennai",
  },
  {
    id: 4,
    name: "Rahul Nair",
    team: "Engineering",
    salary: 91000,
    active: true,
    city: "Kochi",
  },
];
const SAMPLE_JSON = JSON.stringify(SAMPLE_ROWS, null, 2);

const parseRows = (value) => {
  const rows = ensureObjectsFromJson(JSON.parse(value));
  if (!rows.length)
    throw new Error("JSON must be an array of objects or rows.");
  return rows;
};

const excelColumnLabel = (index) => {
  let number = index + 1;
  let label = "";
  while (number > 0) {
    number -= 1;
    label = String.fromCharCode(65 + (number % 26)) + label;
    number = Math.floor(number / 26);
  }
  return label;
};

const JSONToExcel = () => {
  const fileInputRef = useRef(null);
  const editorRef = useRef(null);
  const gutterRef = useRef(null);
  const [text, setText] = useState(SAMPLE_JSON);
  const [fileName, setFileName] = useState(DEFAULT_FILE_NAME);
  const [previewRows, setPreviewRows] = useState(SAMPLE_ROWS);
  const [error, setError] = useState("");
  const [status, setStatus] = useState({ type: "ready", message: "" });
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const columns = useMemo(
    () => (previewRows.length ? Object.keys(previewRows[0]) : []),
    [previewRows],
  );
  const lineNumbers = useMemo(
    () =>
      Array.from(
        { length: Math.max(text.split(/\r\n|\r|\n/).length, 1) },
        (_, index) => index + 1,
      ),
    [text],
  );
  const readyMessage = `Ready: ${previewRows.length} rows and ${columns.length} columns will be exported`;

  const showError = useCallback((message) => {
    setError(message);
    setStatus({ type: "error", message });
  }, []);

  const createPreview = useCallback(
    (source) => {
      try {
        const rows = parseRows(source);
        setPreviewRows(rows);
        setError("");
        setStatus({
          type: "ready",
          message: `Ready: ${rows.length} rows and ${Object.keys(rows[0]).length} columns will be exported`,
        });
        return rows;
      } catch (parseError) {
        setPreviewRows([]);
        showError(
          parseError instanceof SyntaxError
            ? `Invalid JSON: ${parseError.message}`
            : parseError.message,
        );
        return null;
      }
    },
    [showError],
  );

  const handleChange = useCallback((event) => {
    const nextText = event.target.value;
    setText(nextText);
    setPreviewRows([]);
    setError("");
    setStatus({
      type: nextText.trim() ? "idle" : "empty",
      message: nextText.trim()
        ? "Preview JSON to check export data"
        : "Paste JSON to get started",
    });
  }, []);

  const handlePreview = useCallback(
    () => createPreview(text),
    [createPreview, text],
  );

  const handleDownload = useCallback(() => {
    const rows = createPreview(text);
    if (!rows) return;

    try {
      const worksheet = XLSX.utils.json_to_sheet(normalizeExcelHeaders(rows));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
      const data = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const url = URL.createObjectURL(
        new Blob([data], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
      );
      const anchor = document.createElement("a");
      const baseName =
        fileName.trim().replace(/\.xlsx$/i, "") || DEFAULT_FILE_NAME;
      anchor.href = url;
      anchor.download = `${baseName}.xlsx`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus({ type: "ready", message: `${baseName}.xlsx downloaded` });
    } catch (downloadError) {
      showError("Failed to generate Excel file.");
    }
  }, [createPreview, fileName, showError, text]);

  const processFile = useCallback(
    async (file) => {
      if (!file) return;
      if (
        !/\.json$/i.test(file.name) &&
        !["application/json", "text/json"].includes(file.type)
      ) {
        showError("Only JSON files are supported.");
        return;
      }

      setIsLoading(true);
      setStatus({ type: "idle", message: "Loading JSON file" });
      try {
        const content = await file.text();
        setText(content);
        setFileName(file.name.replace(/\.json$/i, "") || DEFAULT_FILE_NAME);
        createPreview(content);
      } catch (fileError) {
        showError("Could not read the selected JSON file.");
      } finally {
        setIsLoading(false);
      }
    },
    [createPreview, showError],
  );

  const handleFileChange = useCallback(
    async (event) => {
      await processFile(event.target.files?.[0]);
      event.target.value = "";
    },
    [processFile],
  );

  const handleDragOver = useCallback((event) => {
    event.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event) => {
    if (!event.currentTarget.contains(event.relatedTarget))
      setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (event) => {
      event.preventDefault();
      setIsDragging(false);
      await processFile(event.dataTransfer.files?.[0]);
    },
    [processFile],
  );

  const handleClear = useCallback(() => {
    setText("");
    setPreviewRows([]);
    setFileName(DEFAULT_FILE_NAME);
    setError("");
    setStatus({ type: "empty", message: "Paste JSON to get started" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const syncScroll = useCallback(() => {
    if (gutterRef.current && editorRef.current) {
      gutterRef.current.scrollTop = editorRef.current.scrollTop;
    }
  }, []);

  return (
    <div className="json-to-excel">
      <header className="json-to-excel-heading">
        <h1>JSON to Excel</h1>
        <p>
          Paste a JSON array (objects or rows), then preview or download it as
          an Excel file.
        </p>
      </header>

      <main className="json-to-excel-card">
        <div className="json-to-excel-toolbar">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={handleFileChange}
          />
          <div
            className={`json-file-drop ${isDragging ? "dragging" : ""}`}
            onDragEnter={handleDragOver}
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
                ? "Drop a .json file here"
                : "Drop a .json file here, or"}
            </span>
            <button
              type="button"
              className="browse-button"
              onClick={() => fileInputRef.current?.click()}
            >
              browse
            </button>
          </div>

          <label className="excel-filename">
            <span>File name</span>
            <input
              value={fileName}
              onChange={(event) => setFileName(event.target.value)}
              aria-label="Excel file name"
            />
            <span className="file-extension">.xlsx</span>
          </label>
          <button
            type="button"
            className="tool-button download-button"
            onClick={handleDownload}
            disabled={!text.trim() || isLoading}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
            >
              <path d="M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5M4 17v4h16v-4" />
            </svg>
          </button>
          <button
            type="button"
            className="tool-button"
            onClick={handleClear}
            disabled={isLoading}
          >
            Clear
          </button>
        </div>

        <div className="json-excel-panes">
          <section
            className="json-excel-pane input-pane"
            aria-label="JSON input"
          >
            <div className="json-excel-pane-heading">
              <strong>JSON input</strong>
              <span>Paste JSON here</span>
            </div>
            <div className="json-input-editor">
              <div
                className="json-line-gutter"
                ref={gutterRef}
                aria-hidden="true"
              >
                {lineNumbers.map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </div>
              <textarea
                ref={editorRef}
                value={text}
                onChange={handleChange}
                onScroll={syncScroll}
                placeholder="Paste JSON here"
                aria-label="JSON input editor"
                aria-invalid={Boolean(error)}
                spellCheck={false}
              />
            </div>
          </section>

          <section
            className="json-excel-pane preview-pane"
            aria-label="Excel preview"
          >
            <div className="json-excel-pane-heading">
              <strong>Excel preview</strong>
              <span>
                {previewRows.length} rows x {columns.length} columns
              </span>
            </div>
            <div className="worksheet-scroll">
              {previewRows.length ? (
                <table className="worksheet-table">
                  <thead>
                    <tr className="column-letters">
                      <th className="row-heading" />
                      {columns.map((column, index) => (
                        <th key={column}>{excelColumnLabel(index)}</th>
                      ))}
                    </tr>
                    <tr className="column-headings">
                      <th className="row-heading">1</th>
                      {columns.map((column) => (
                        <th key={column}>{column}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        <th className="row-heading">{rowIndex + 2}</th>
                        {columns.map((column) => (
                          <td key={column}>
                            {row[column] == null ? "" : String(row[column])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="worksheet-empty">Preview will appear here</div>
              )}
            </div>
          </section>
        </div>

        <div
          className={`json-excel-status status-${status.type}`}
          role="status"
          aria-live="polite"
        >
          <span className="status-indicator" />
          <span>
            {error || (status.type === "ready" ? readyMessage : status.message)}
          </span>
        </div>
      </main>
    </div>
  );
};

export default JSONToExcel;
