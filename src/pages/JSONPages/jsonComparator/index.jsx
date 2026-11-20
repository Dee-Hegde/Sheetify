import React, { useCallback, useMemo, useRef, useState } from "react";
import PageTitle from "../../../components/PageTitle";
import { appIcons } from "../../../assets/images/Icons/appIcons";
import { renderJsonTokens } from "../../../utils/dataCleaner";
import { formatJson } from "../../../utils/jsonFormatter";
import {
  diffTextLines,
  findJsonDifferencePaths,
  getStructuralChangedLines,
} from "../../../utils/jsonDiff";
import "./jsonComparator.scss";

const LEFT_EXAMPLE = `{
  "name": "Jordan Lee",
  "role": "Designer",
  "active": true,
  "skills": ["React", "Figma"],
  "location": {
    "city": "Portland",
    "country": "US"
  }
}`;

const RIGHT_EXAMPLE = `{
  "name": "Jordan Li",
  "role": "Product Designer",
  "skills": ["React", "TypeScript"],
  "location": {
    "city": "Portland",
    "country": "US"
  },
  "team": "Product"
}`;

const parseSide = (text) => {
  if (!text.trim()) return { valid: false, empty: true, error: "" };
  const result = formatJson(text);
  return result.success
    ? { valid: true, value: result.parsed, error: "" }
    : { valid: false, empty: false, error: result.error };
};

const DiffPane = ({
  side,
  title,
  text,
  onChange,
  onFileSelect,
  fileName,
  changedLines,
  validationMessage,
}) => {
  const fileInputRef = useRef(null);
  const editorRef = useRef(null);
  const gutterRef = useRef(null);
  const highlightRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const lines = useMemo(() => text.split(/\r\n|\n|\r/), [text]);

  const syncScroll = useCallback(() => {
    if (!editorRef.current) return;
    if (gutterRef.current) {
      gutterRef.current.scrollTop = editorRef.current.scrollTop;
    }
    if (highlightRef.current) {
      highlightRef.current.scrollTop = editorRef.current.scrollTop;
      highlightRef.current.scrollLeft = editorRef.current.scrollLeft;
    }
  }, []);

  const handleFileChange = useCallback(
    async (event) => {
      const file = event.target.files?.[0];
      if (file) await onFileSelect(side, file);
      event.target.value = "";
    },
    [onFileSelect, side],
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
      const file = event.dataTransfer?.files?.[0];
      if (file) await onFileSelect(side, file);
    },
    [onFileSelect, side],
  );

  return (
    <section
      className={`comparator-pane ${isDragging ? "dragging" : ""}`}
      aria-label={`${title} JSON`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        aria-label={`Upload ${title} JSON file`}
        hidden
        onChange={handleFileChange}
      />
      <div className="comparator-pane-heading">
        <div className="pane-title">
          <strong>{title}</strong>
          <span>{lines.length} lines</span>
        </div>
        <div className="pane-upload">
          {fileName && <span className="file-name">{fileName}</span>}
          <button
            type="button"
            className="upload-button"
            onClick={() => fileInputRef.current?.click()}
          >
            {appIcons?.upload && <appIcons.upload className="theme-icon" />}
            Upload
          </button>
        </div>
      </div>
      <div className="diff-editor">
        <div
          className="line-gutter"
          ref={gutterRef}
          aria-hidden="true"
        >
          {lines.map((_, index) => (
            <span
              key={index}
              className={changedLines.has(index) ? "changed-line" : ""}
            >
              {index + 1}
            </span>
          ))}
        </div>
        <div className="code-surface">
          <pre
            ref={highlightRef}
            className="syntax-highlight"
            aria-hidden="true"
          >
            {text ? (
              lines.map((line, index) => (
                <span
                  className={`diff-line ${changedLines.has(index) ? "changed-line" : ""}`}
                  key={index}
                >
                  {line ? renderJsonTokens(line) : " "}
                </span>
              ))
            ) : (
              <span className="empty-placeholder">
                Paste JSON or upload a file
              </span>
            )}
          </pre>
          <textarea
            ref={editorRef}
            value={text}
            onChange={(event) => onChange(side, event.target.value)}
            onScroll={syncScroll}
            spellCheck={false}
            aria-label={`${title} JSON editor`}
            aria-invalid={Boolean(validationMessage)}
            className={validationMessage ? "invalid" : ""}
          />
        </div>
      </div>
      {validationMessage && (
        <div className="pane-validation" role="alert">
          {validationMessage}
        </div>
      )}
      {isDragging && (
        <div className="pane-drop-overlay" aria-live="polite">
          Drop JSON file here
        </div>
      )}
    </section>
  );
};

const JsonComparator = ({ title }) => {
  const [leftText, setLeftText] = useState(LEFT_EXAMPLE);
  const [rightText, setRightText] = useState(RIGHT_EXAMPLE);
  const [leftFileName, setLeftFileName] = useState("");
  const [rightFileName, setRightFileName] = useState("");
  const [fileErrors, setFileErrors] = useState({ left: "", right: "" });
  const [comparisonMode, setComparisonMode] = useState("structural");

  const leftParsed = useMemo(() => parseSide(leftText), [leftText]);
  const rightParsed = useMemo(() => parseSide(rightText), [rightText]);
  const lineDiff = useMemo(
    () => diffTextLines(leftText, rightText),
    [leftText, rightText],
  );
  const structuralChangedPaths = useMemo(
    () =>
      leftParsed.valid && rightParsed.valid
        ? findJsonDifferencePaths(leftParsed.value, rightParsed.value)
        : [],
    [leftParsed, rightParsed],
  );

  const structuralLeftLines = useMemo(
    () =>
      getStructuralChangedLines(
        leftText,
        structuralChangedPaths,
        lineDiff.leftChanged,
      ),
    [leftText, lineDiff.leftChanged, structuralChangedPaths],
  );
  const structuralRightLines = useMemo(
    () =>
      getStructuralChangedLines(
        rightText,
        structuralChangedPaths,
        lineDiff.rightChanged,
      ),
    [lineDiff.rightChanged, rightText, structuralChangedPaths],
  );

  const leftChangedLines =
    comparisonMode === "structural" && leftParsed.valid && rightParsed.valid
      ? structuralLeftLines
      : lineDiff.leftChanged;
  const rightChangedLines =
    comparisonMode === "structural" && leftParsed.valid && rightParsed.valid
      ? structuralRightLines
      : lineDiff.rightChanged;
  const rightModifiedLineCount = rightChangedLines.size;
  const rightStatusMessage =
    rightModifiedLineCount === 1
      ? "Right-hand JSON: 1 line modified"
      : `Right-hand JSON: ${rightModifiedLineCount} lines modified`;

  const handleTextChange = useCallback((side, value) => {
    if (side === "left") {
      setLeftText(value);
      setLeftFileName("");
    } else {
      setRightText(value);
      setRightFileName("");
    }
    setFileErrors((current) => ({ ...current, [side]: "" }));
  }, []);

  const handleFileSelect = useCallback(async (side, file) => {
    const isJsonFile =
      /\.json$/i.test(file.name || "") ||
      ["application/json", "text/json", "application/ld+json"].includes(
        file.type,
      );
    if (!isJsonFile) {
      setFileErrors((current) => ({
        ...current,
        [side]: "Only JSON files are supported.",
      }));
      return;
    }

    try {
      const content = await file.text();
      if (side === "left") {
        setLeftText(content);
        setLeftFileName(file.name);
      } else {
        setRightText(content);
        setRightFileName(file.name);
      }
      setFileErrors((current) => ({ ...current, [side]: "" }));
    } catch {
      setFileErrors((current) => ({
        ...current,
        [side]: "Could not read the selected JSON file.",
      }));
    }
  }, []);

  const handleClear = useCallback(() => {
    setLeftText("");
    setRightText("");
    setLeftFileName("");
    setRightFileName("");
    setFileErrors({ left: "", right: "" });
  }, []);

  const leftValidation =
    fileErrors.left ||
    (comparisonMode === "structural" && leftParsed.error
      ? `Invalid JSON: ${leftParsed.error}`
      : "");
  const rightValidation =
    fileErrors.right ||
    (comparisonMode === "structural" && rightParsed.error
      ? `Invalid JSON: ${rightParsed.error}`
      : "");

  return (
    <div className="json-comparator-page-container">
      <PageTitle title={title} />
      <main className="json-comparator-card">
        <div className="json-comparator-toolbar">
          <div className="comparison-mode-control">
            <span>Compare</span>
            <div
              className="comparison-mode-options"
              role="group"
              aria-label="Comparison mode"
            >
              <button
                type="button"
                className={comparisonMode === "structural" ? "active" : ""}
                aria-pressed={comparisonMode === "structural"}
                onClick={() => setComparisonMode("structural")}
              >
                JSON structure
              </button>
              <button
                type="button"
                className={comparisonMode === "text" ? "active" : ""}
                aria-pressed={comparisonMode === "text"}
                onClick={() => setComparisonMode("text")}
              >
                Text lines
              </button>
            </div>
          </div>
          <span className="toolbar-hint">
            Changes update as you type
          </span>
          <button
            type="button"
            className="toolbar-button clear-button"
            onClick={handleClear}
          >
            Clear both
          </button>
        </div>

        <div className="comparator-panes">
          <DiffPane
            side="left"
            title="Original"
            text={leftText}
            onChange={handleTextChange}
            onFileSelect={handleFileSelect}
            fileName={leftFileName}
            changedLines={leftChangedLines}
            validationMessage={leftValidation}
          />
          <DiffPane
            side="right"
            title="Modified"
            text={rightText}
            onChange={handleTextChange}
            onFileSelect={handleFileSelect}
            fileName={rightFileName}
            changedLines={rightChangedLines}
            validationMessage={rightValidation}
          />
        </div>
        <div
          className="json-comparator-status"
          role="status"
          aria-live="polite"
        >
          <span className="status-indicator" aria-hidden="true" />
          <span>{rightStatusMessage}</span>
        </div>
      </main>
    </div>
  );
};

export default JsonComparator;
