import React, { useCallback, useEffect, useState } from "react";
import * as XLSX from "xlsx";
import {
  ensureObjectsFromJson,
  normalizeExcelHeaders,
} from "../../utils/jsonNormalize";
import "../ExcelToJson/excelToJson.css";

const JSONToExcel = () => {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [itemsCount, setItemsCount] = useState(0);
  const [fileName, setFileName] = useState("sheetify_export.xlsx");
  const [previewRows, setPreviewRows] = useState([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handleChange = useCallback((e) => {
    setText(e.target.value);
    setError("");
    setItemsCount(0);
  }, []);

  const convertJson = useCallback(() => {
    setError("");
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      setError("Invalid JSON. Please check your input.");
      return null;
    }

    const normalized = ensureObjectsFromJson(data);
    if (!Array.isArray(normalized) || normalized.length === 0) {
      setError("JSON must be an array of objects or rows.");
      return null;
    }
    setItemsCount(normalized.length);
    return normalized;
  }, [text]);

  const handlePreview = useCallback(() => {
    const normalized = convertJson();
    if (!normalized) return;
    const withNiceHeaders = normalizeExcelHeaders(normalized);
    setPreviewRows(withNiceHeaders);
    setIsPreviewOpen(true);
  }, [convertJson]);

  const closePreview = useCallback(() => {
    setIsPreviewOpen(false);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        setIsPreviewOpen(false);
      }
    };
    if (isPreviewOpen) {
      document.addEventListener("keydown", onKey);
    }
    return () => document.removeEventListener("keydown", onKey);
  }, [isPreviewOpen]);

  const convertAndDownload = useCallback(() => {
    const normalized = convertJson();
    if (!normalized) return;

    try {
      const withNiceHeaders = normalizeExcelHeaders(normalized);
      const ws = XLSX.utils.json_to_sheet(withNiceHeaders);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      const array = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([array], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        fileName && fileName.trim() ? fileName.trim() : "sheetify_export.xlsx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError("Failed to generate Excel file.");
    }
  }, [text, fileName]);

  return (
    <div className="App">
      <div className="container">
        <div className="titlebar">
          <p className="subtitle">
            Paste a JSON array (objects or rows), then preview or download as
            Excel.
          </p>
        </div>
        <div className="controls">
          <label htmlFor="file-name">File name:</label>
          <input
            id="file-name"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            type="text"
          />
          <button
            aria-label="preview"
            onClick={handlePreview}
            className="btn"
            disabled={!text.trim()}
          >
            Preview
          </button>
          <button
            aria-label="download"
            onClick={convertAndDownload}
            className="btn primary"
            disabled={!text.trim()}
          >
            Download Excel
          </button>
        </div>
        <div className="stats">
          {itemsCount > 0 ? (
            <span>{itemsCount} items detected</span>
          ) : (
            <span>No data yet</span>
          )}
        </div>
        {error ? (
          <p
            className="error"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        <div className="output">
          <textarea
            aria-label="json-paste-input"
            placeholder="Paste JSON here..."
            value={text}
            onChange={handleChange}
          />
        </div>

        {isPreviewOpen ? (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Preview"
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(16, 24, 40, 0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
            }}
          >
            <div
              style={{
                maxWidth: 960,
                width: "90%",
                background: "#fff",
                borderRadius: 12,
                boxShadow: "0 20px 40px rgba(16,24,40,0.22)",
                border: "1px solid #e6eaf0",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: 12,
                  borderBottom: "1px solid #e6eaf0",
                }}
              >
                <h3 style={{ margin: 0 }}>Preview</h3>
                <button
                  aria-label="close-preview"
                  onClick={closePreview}
                  className="btn"
                >
                  Close
                </button>
              </div>
              <div style={{ padding: 12, maxHeight: 520, overflow: "auto" }}>
                {previewRows.length > 0 ? (
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        {Object.keys(previewRows[0] || {}).map((key) => (
                          <th
                            key={key}
                            style={{
                              textAlign: "left",
                              padding: 8,
                              borderBottom: "1px solid #e6eaf0",
                            }}
                          >
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, idx) => (
                        <tr key={idx}>
                          {Object.keys(previewRows[0] || {}).map((key) => (
                            <td
                              key={key}
                              style={{
                                padding: 8,
                                borderBottom: "1px solid #f0f2f6",
                              }}
                            >
                              {row[key]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p style={{ color: "#667085" }}>No data to preview.</p>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default JSONToExcel;
