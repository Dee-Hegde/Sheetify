import React, { useCallback, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import PageTitle from "../../../components/PageTitle";
import {
  ensureObjectsFromJson,
  normalizeExcelHeaders,
} from "../../../utils/jsonNormalize";
import { renderJsonTokens } from "../../../utils/dataCleaner";
import { appIcons } from "../../../assets/images/Icons/appIcons";
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
  if (!rows.length) {
    throw new Error("JSON must be an array of objects or rows.");
  }
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

const JsonToExcel = ({ title }) => {
  const fileInputRef = useRef(null);
  const editorRef = useRef(null);
  const gutterRef = useRef(null);
  const syntaxRef = useRef(null);
  const [text, setText] = useState(SAMPLE_JSON);
  const [fileName, setFileName] = useState(DEFAULT_FILE_NAME);
  const [previewRows, setPreviewRows] = useState(SAMPLE_ROWS);
  const [error, setError] = useState("");
  const [status, setStatus] = useState({
    type: "ready",
    message: `Ready: ${SAMPLE_ROWS.length} rows and ${Object.keys(SAMPLE_ROWS[0]).length} columns will be exported`,
  });
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
            : parseError instanceof Error
              ? parseError.message
              : "Failed to parse JSON.",
        );
        return null;
      }
    },
    [showError],
  );

  const handleChange = useCallback(
    (event) => {
      const nextText = event.target.value;
      setText(nextText);
      if (nextText.trim()) {
        createPreview(nextText);
      } else {
        setPreviewRows([]);
        setError("");
        setStatus({ type: "empty", message: "Paste JSON to get started" });
      }
    },
    [createPreview],
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
    } catch {
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
      } catch {
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
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsDragging(false);
    }
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
    if (syntaxRef.current && editorRef.current) {
      syntaxRef.current.scrollTop = editorRef.current.scrollTop;
      syntaxRef.current.scrollLeft = editorRef.current.scrollLeft;
    }
  }, []);

  return (
    <div className="json-to-excel-page-container">
      <PageTitle title={title} />
      <div className="json-to-excel-page-card">
        <div className="json-to-excel-page-toolbar">
          <input
            ref={fileInputRef}
            aria-label="Upload JSON file"
            type="file"
            accept=".json,application/json"
            hidden
            onChange={handleFileChange}
          />
          <div
            className={`json-file-drop ${isDragging ? "dragging" : ""}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {appIcons?.upload && <appIcons.upload className="theme-icon" />}
            <span>{isDragging ? "Drop JSON file here" : "Drop JSON file here or"}</span>
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
            className="toolbar-button download-button"
            onClick={handleDownload}
            disabled={!text.trim() || isLoading}
            aria-label="Download Excel file"
            title="Download Excel file"
          >
            {appIcons?.download && <appIcons.download className="theme-icon" />}
            Download
          </button>
          <button
            type="button"
            className="toolbar-button clear-button"
            onClick={handleClear}
            disabled={isLoading}
          >
            Clear
          </button>
        </div>

        <div className="json-to-excel-page-panes">
          <section
            className="json-to-excel-page-pane json-input-pane"
            aria-label="JSON input"
          >
            <div className="json-to-excel-page-pane-heading">
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
              <div className="json-code-surface">
                <pre
                  ref={syntaxRef}
                  className="json-syntax-highlight"
                  aria-hidden="true"
                >
                  {text ? (
                    renderJsonTokens(text)
                  ) : (
                    <span className="output-placeholder">Paste JSON here</span>
                  )}
                </pre>
                <textarea
                  ref={editorRef}
                  value={text}
                  onChange={handleChange}
                  onScroll={syncScroll}
                  aria-label="JSON input editor"
                  aria-invalid={Boolean(error)}
                  spellCheck={false}
                />
              </div>
            </div>
          </section>

          <section
            className="json-to-excel-page-pane excel-preview-pane"
            aria-label="Excel preview"
          >
            <div className="json-to-excel-page-pane-heading">
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
          className={`json-to-excel-page-status status-${status.type}`}
          role={error ? "alert" : "status"}
          aria-live="polite"
        >
          <span className="status-indicator" />
          <span>
            {isLoading
              ? "Reading JSON file..."
              : error || status.message || readyMessage}
          </span>
        </div>
      </div>
    </div>
  );
};

export default JsonToExcel;
