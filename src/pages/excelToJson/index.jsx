import React, { useCallback, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import PageTitle from "../../components/PageTitle";
import {
  cleanAndConvertFromRows,
  renderJsonTokens,
  SAMPLE_ROWS,
  toColumnLabel,
} from "../../utils/dataCleaner";
import exceltojson from "./exceltojson.scss";
import { appIcons } from "../../assets/images/Icons/appIcons";

const ExcelToJson = (props) => {
  const fileInputRef = useRef(null);
  const jsonOutputRef = useRef(null);
  const gutterRef = useRef(null);

  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [sheets, setSheets] = useState({ Sheet1: SAMPLE_ROWS });
  const [sheetNames, setSheetNames] = useState(["Sheet1"]);
  const [selectedSheet, setSelectedSheet] = useState("Sheet1");
  const [fileName, setFileName] = useState("sample_data.xlsx");
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [indentSize, setIndentSize] = useState(2);

  const rows = sheets[selectedSheet] || [];
  const columns = useMemo(
    () =>
      Array.from(
        { length: Math.max(...rows.map((row) => row.length), 0) },
        (_, index) => index,
      ),
    [rows],
  );
  const jsonData = useMemo(() => cleanAndConvertFromRows(rows), [rows]);
  const jsonText = useMemo(
    () => JSON.stringify(jsonData, null, indentSize),
    [indentSize, jsonData],
  );
  const hasData = useMemo(
    () => Array.isArray(jsonData) && jsonData.length > 0,
    [jsonData],
  );

  const lineNumbers = useMemo(
    () =>
      Array.from(
        { length: Math.max(jsonText.split(/\r\n|\r|\n/).length, 1) },
        (_, index) => index + 1,
      ),
    [jsonText],
  );
  const statusText =
    error ||
    feedback ||
    (hasData
      ? `Converted ${jsonData?.length} rows and ${Object.keys(jsonData[0]).length} columns to JSON`
      : "Upload or drop a CSV or Excel file to get started");

  // Core methods

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

  const processFile = useCallback(
    async (file) => {
      setError("");
      setFeedback("");
      if (!file) return;
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

  const handleFileChange = useCallback(
    async (evt) => {
      const file = evt.target.files && evt.target.files[0];
      await processFile(file);
      evt.target.value = "";
    },
    [processFile],
  );

  const syncOutputScroll = useCallback(() => {
    if (gutterRef.current && jsonOutputRef.current) {
      gutterRef.current.scrollTop = jsonOutputRef.current.scrollTop;
    }
  }, []);
  return (
    <div className="excel-to-json-page-container">
      <PageTitle title={props?.title} />
      <div className="excel-to-json-card">
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
           {appIcons?.upload && (
              <appIcons.upload className="theme-icon" />
            )}
            <span>
              Drop file here or {" "}
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
              <div className="output-actions">
                <button
                  type="button"
                  className="output-icon-button"
                  onClick={handleCopy}
                  disabled={!hasData}
                  aria-label="Copy JSON"
                  title="Copy JSON"
                >
                  {appIcons?.copy && <appIcons.copy className="theme-icon" />}
                </button>
                <button
                  type="button"
                  className="output-icon-button"
                  onClick={handleDownload}
                  disabled={!hasData}
                  aria-label="Download JSON"
                  title="Download JSON"
                >
                  {appIcons?.download && (
                    <appIcons.download className="theme-icon" />
                  )}
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
      </div>
    </div>
  );
};

export default ExcelToJson;
