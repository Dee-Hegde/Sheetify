import React, { useCallback, useMemo, useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { cleanAndConvertFromRows } from "../../utils/dataCleaner";
import "./excelToJson.css";

const ExcelToJsonConverter = () => {
  const [jsonData, setJsonData] = useState([]);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [copied, setCopied] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const hasData = useMemo(
    () => Array.isArray(jsonData) && jsonData.length > 0,
    [jsonData]
  );

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

  const parseExcelRows = useCallback((arrayBuffer) => {
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new Error("No sheets found in Excel file");
    }
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: null,
    });
    return rows; // 2D array of rows
  }, []);

  const processFile = useCallback(
    async (file) => {
      setError("");
      setJsonData([]);
      if (!file) return;
      setFileName(file.name);
      const ext = file.name.toLowerCase().split(".").pop();
      try {
        if (ext === "csv") {
          const text = await file.text();
          const rows = parseCsvRows(text);
          const cleaned = cleanAndConvertFromRows(rows);
          setJsonData(cleaned);
        } else if (ext === "xlsx" || ext === "xls") {
          const buffer = await file.arrayBuffer();
          const rows = parseExcelRows(buffer);
          const cleaned = cleanAndConvertFromRows(rows);
          setJsonData(cleaned);
        } else {
          throw new Error("Unsupported file type. Please upload CSV or Excel.");
        }
      } catch (e) {
        setError(e.message || "Failed to parse file");
      }
    },
    [parseCsvRows, parseExcelRows]
  );

  const handleFileChange = useCallback(
    async (evt) => {
      const file = evt.target.files && evt.target.files[0];
      await processFile(file);
    },
    [processFile]
  );

  const handleDragOver = useCallback((evt) => {
    evt.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
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
    [processFile]
  );

  const handleCopy = useCallback(async () => {
    try {
      const text = JSON.stringify(jsonData, null, 2);
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (e) {
      setError("Failed to copy to clipboard");
    }
  }, [jsonData]);

  const handleClear = useCallback(() => {
    setJsonData([]);
    setError("");
    setFileName("");
    setCopied(false);
    setIsDragging(false);
  }, []);
  return (
    <div className="App">
      <div className="container">
        <div className="titlebar">
          <p className="subtitle">
            Upload or drag-and-drop a CSV/Excel file to convert and copy JSON.
          </p>
        </div>
        <div
          className={"dropzone" + (isDragging ? " dragging" : "")}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="controls">
            <input
              aria-label="file-input"
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
            />
            <button
              aria-label="clear"
              className="btn"
              onClick={handleClear}
            >
              Clear
            </button>
          </div>
          <p className="hint">
            Drag & drop a CSV/Excel file here, or use the file picker.
          </p>
        </div>
        <div className="stats">
          {hasData ? (
            <span>{jsonData.length} items parsed</span>
          ) : (
            <span>No data yet</span>
          )}
        </div>
        {copied ? (
          <div
            className="toast success"
            role="status"
          >
            Copied to clipboard
          </div>
        ) : null}
        {fileName ? <p className="filename">Loaded: {fileName}</p> : null}
        {error ? (
          <p
            className="error"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        <div className="output">
          <button
            aria-label="copy"
            title="Copy JSON"
            className={"icon-btn copy-btn" + (hasData ? "" : " disabled")}
            onClick={handleCopy}
            disabled={!hasData}
          >
            <svg
              aria-hidden="true"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M16 1H4a2 2 0 0 0-2 2v12h2V3h12V1Zm4 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 16H8V7h12v14Z"
                fill="currentColor"
              />
            </svg>
          </button>
          <textarea
            aria-label="json-output"
            readOnly
            value={hasData ? JSON.stringify(jsonData, null, 2) : ""}
            placeholder="Parsed JSON will appear here..."
          />
        </div>
      </div>
    </div>
  );
};

export default ExcelToJsonConverter;
