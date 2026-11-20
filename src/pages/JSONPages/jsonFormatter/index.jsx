import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import PageTitle from "../../../components/PageTitle";
import { appIcons } from "../../../assets/images/Icons/appIcons";
import { renderJsonTokens } from "../../../utils/dataCleaner";
import { formatJson } from "../../../utils/jsonFormatter";
import "./jsonFormatter.scss";

const DEFAULT_FILE_NAME = "formatted-data.json";
const EXAMPLE_JSON = `{
  "name": "John Doe",
  "age": 30,
  "skills": [
    "JavaScript",
    "React"
  ],
  "active": true,
  "manager": null,
  "address": {
    "city": "Mysore",
    "country": "India"
  }
}`;

const EMPTY_STATUS = {
  type: "empty",
  message: "Paste JSON to get started",
  details: "",
};

const formatErrorStatus = (result) => ({
  type: "invalid",
  message: "Invalid JSON",
  details: result.error || "The JSON could not be parsed.",
});

const JsonFormatter = ({ title }) => {
  const fileInputRef = useRef(null);
  const editorRef = useRef(null);
  const gutterRef = useRef(null);
  const outputRef = useRef(null);
  const outputGutterRef = useRef(null);
  const [jsonText, setJsonText] = useState(EXAMPLE_JSON);
  const [formattedText, setFormattedText] = useState(EXAMPLE_JSON);
  const [status, setStatus] = useState({
    type: "valid",
    message: "Valid JSON, formatted",
    details: "",
  });
  const [feedback, setFeedback] = useState("");
  const [fileName, setFileName] = useState(DEFAULT_FILE_NAME);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const lineNumbers = useMemo(() => {
    const totalLines = Math.max(jsonText.split(/\r\n|\r|\n/).length, 1);
    return Array.from({ length: totalLines }, (_, index) => index + 1);
  }, [jsonText]);

  const outputLineNumbers = useMemo(() => {
    const totalLines = Math.max(formattedText.split(/\r\n|\r|\n/).length, 1);
    return Array.from({ length: totalLines }, (_, index) => index + 1);
  }, [formattedText]);

  const updateStatus = useCallback((type, message, details = "") => {
    setStatus({ type, message, details });
  }, []);

  const getJsonFileError = useCallback((file) => {
    if (!file) return "Only JSON files are supported.";

    const hasJsonExtension = /\.json$/i.test(file.name || "");
    const hasJsonMime = [
      "application/json",
      "text/json",
      "application/ld+json",
    ].includes(file.type);

    return hasJsonExtension || hasJsonMime
      ? ""
      : "Only JSON files are supported.";
  }, []);

  const processJsonFile = useCallback(
    async (file) => {
      if (!file) return;

      const invalidReason = getJsonFileError(file);
      if (invalidReason) {
        updateStatus("invalid", "Invalid JSON file", invalidReason);
        setFeedback("Only JSON files are supported.");
        return;
      }

      setFileName(file.name || DEFAULT_FILE_NAME);
      setIsLoading(true);
      setFeedback("");

      try {
        const fileText = await file.text();
        setJsonText(fileText);

        if (!fileText.trim()) {
          setFormattedText("");
          updateStatus(EMPTY_STATUS.type, EMPTY_STATUS.message);
          setFeedback("Uploaded file is empty");
          return;
        }

        const result = formatJson(fileText);
        if (result.success) {
          setFormattedText(result.formatted);
          updateStatus("valid", "Valid JSON, formatted");
          setFeedback(`${file.name || "JSON file"} loaded`);
        } else {
          setFormattedText("");
          setStatus(formatErrorStatus(result));
          setFeedback("Invalid JSON file loaded");
        }
      } catch {
        setFormattedText("");
        updateStatus(
          "invalid",
          "File read failed",
          "The selected file could not be read.",
        );
        setFeedback("Unable to read file");
      } finally {
        setIsLoading(false);
      }
    },
    [getJsonFileError, updateStatus],
  );

  const handleEditorChange = useCallback(
    (event) => {
      const nextText = event.target.value;
      setJsonText(nextText);
      setFormattedText("");
      setFeedback("");
      if (!nextText.trim()) {
        updateStatus(EMPTY_STATUS.type, EMPTY_STATUS.message);
      } else {
        updateStatus("ready", "Ready to format");
      }
    },
    [updateStatus],
  );

  const handleFormat = useCallback(() => {
    if (!jsonText.trim()) {
      setFormattedText("");
      updateStatus(EMPTY_STATUS.type, EMPTY_STATUS.message);
      return;
    }

    const result = formatJson(jsonText);
    if (result.success) {
      const formatted = JSON.stringify(result.parsed, null, 2);
      setJsonText(formatted);
      setFormattedText(formatted);
      updateStatus("valid", "Valid JSON, formatted");
      setFeedback("JSON formatted");
      return;
    }

    setFormattedText("");
    setStatus(formatErrorStatus(result));
    setFeedback("");
  }, [jsonText, updateStatus]);

  const handleMinify = useCallback(() => {
    const result = formatJson(jsonText);
    if (!result.success) {
      setFormattedText("");
      setStatus(formatErrorStatus(result));
      setFeedback("");
      return;
    }

    setFormattedText(JSON.stringify(result.parsed));
    updateStatus("valid", "Valid JSON, minified");
    setFeedback("JSON minified");
  }, [jsonText, updateStatus]);

  const handleClear = useCallback(() => {
    setJsonText("");
    setFormattedText("");
    setFileName(DEFAULT_FILE_NAME);
    setFeedback("");
    updateStatus(EMPTY_STATUS.type, EMPTY_STATUS.message);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [updateStatus]);

  const handleCopy = useCallback(async () => {
    const textToCopy = formattedText || jsonText;
    if (!textToCopy.trim()) {
      updateStatus(EMPTY_STATUS.type, EMPTY_STATUS.message);
      return;
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        const temporaryInput = document.createElement("textarea");
        temporaryInput.value = textToCopy;
        temporaryInput.setAttribute("readonly", "");
        temporaryInput.style.position = "fixed";
        temporaryInput.style.left = "-9999px";
        document.body.appendChild(temporaryInput);
        temporaryInput.select();
        document.execCommand("copy");
        document.body.removeChild(temporaryInput);
      }
      setFeedback("JSON copied to clipboard");
    } catch {
      setFeedback("Unable to copy JSON to clipboard");
    }
  }, [formattedText, jsonText, updateStatus]);

  const handleDownload = useCallback(() => {
    const result = formatJson(jsonText);
    if (!result.success) {
      if (!result.empty) {
        setStatus(formatErrorStatus(result));
      } else {
        updateStatus(EMPTY_STATUS.type, EMPTY_STATUS.message);
      }
      return;
    }

    try {
      const normalizedName =
        (fileName || DEFAULT_FILE_NAME).trim() || DEFAULT_FILE_NAME;
      const safeName = /\.json$/i.test(normalizedName)
        ? normalizedName
        : `${normalizedName}.json`;
      const exportText =
        formattedText || JSON.stringify(result.parsed, null, 2);
      const blob = new Blob([exportText], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = safeName;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setFeedback(`${safeName} downloaded`);
    } catch {
      setFeedback("Download failed");
    }
  }, [fileName, formattedText, jsonText, updateStatus]);

  const handleFileUpload = useCallback(
    async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      await processJsonFile(file);
      event.target.value = "";
    },
    [processJsonFile],
  );

  const handleDragOver = useCallback((event) => {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
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
      await processJsonFile(event.dataTransfer?.files?.[0]);
    },
    [processJsonFile],
  );

  useEffect(() => {
    const handleKeyboardShortcuts = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        handleFormat();
      }
      if (
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        event.key.toLowerCase() === "c"
      ) {
        event.preventDefault();
        handleCopy();
      }
    };

    window.addEventListener("keydown", handleKeyboardShortcuts);
    return () => window.removeEventListener("keydown", handleKeyboardShortcuts);
  }, [handleCopy, handleFormat]);

  const syncInputScroll = useCallback(() => {
    if (gutterRef.current && editorRef.current) {
      gutterRef.current.scrollTop = editorRef.current.scrollTop;
    }
  }, []);

  const syncOutputScroll = useCallback(() => {
    if (outputGutterRef.current && outputRef.current) {
      outputGutterRef.current.scrollTop = outputRef.current.scrollTop;
    }
  }, []);

  const errorLine =
    status.type === "invalid" && status.details
      ? Number((status.details.match(/line\s+(\d+)/i) || [])[1]) || null
      : null;

  return (
    <div className="json-formatter-page-container">
      <PageTitle title={title} />
      <main
        className={`json-formatter-card ${isDragging ? "dragging" : ""}`}
        onDragEnter={handleDragOver}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="json-formatter-toolbar">
          <input
            ref={fileInputRef}
            aria-label="Upload JSON file"
            type="file"
            accept=".json,application/json"
            hidden
            onChange={handleFileUpload}
          />
          <div className={`json-file-drop ${isDragging ? "dragging" : ""}`}>
            {appIcons?.upload && <appIcons.upload className="theme-icon" />}
            <span>Drop JSON file here or</span>
            <button
              type="button"
              className="browse-button"
              onClick={() => fileInputRef.current?.click()}
            >
              browse
            </button>
            {fileName !== DEFAULT_FILE_NAME && (
              <span className="selected-file">{fileName}</span>
            )}
          </div>
          <button
            type="button"
            className="toolbar-button format-button"
            onClick={handleFormat}
            disabled={isLoading || !jsonText.trim()}
          >
            Format
          </button>
          <button
            type="button"
            className="toolbar-button"
            onClick={handleMinify}
            disabled={isLoading || !jsonText.trim()}
          >
            Minify
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

        <div className="json-formatter-panes">
          <section
            className="json-formatter-pane input-pane"
            aria-label="JSON input"
          >
            <div className="json-formatter-pane-heading">
              <strong>JSON input</strong>
              <span>Paste JSON here</span>
            </div>
            <div className="json-input-editor">
              <div
                className="json-line-gutter"
                ref={gutterRef}
                aria-hidden="true"
              >
                {lineNumbers.map((lineNumber) => (
                  <span
                    key={lineNumber}
                    className={errorLine === lineNumber ? "error" : ""}
                  >
                    {lineNumber}
                  </span>
                ))}
              </div>
              <textarea
                ref={editorRef}
                className="json-editor"
                value={jsonText}
                onChange={handleEditorChange}
                onScroll={syncInputScroll}
                placeholder="Paste JSON here"
                spellCheck={false}
                aria-label="JSON input editor"
                aria-invalid={status.type === "invalid"}
              />
            </div>
          </section>

          <section
            className="json-formatter-pane output-pane"
            aria-label="Formatted JSON"
          >
            <div className="json-formatter-pane-heading">
              <strong>Formatted JSON</strong>
              <div className="output-actions">
                <button
                  type="button"
                  className="output-icon-button"
                  onClick={handleCopy}
                  disabled={!formattedText && !jsonText.trim()}
                  aria-label="Copy JSON"
                  title="Copy JSON"
                >
                  {appIcons?.copy && <appIcons.copy className="theme-icon" />}
                </button>
                <button
                  type="button"
                  className="output-icon-button"
                  onClick={handleDownload}
                  disabled={!jsonText.trim()}
                  aria-label="Download JSON"
                  title="Download JSON"
                >
                  {appIcons?.download && (
                    <appIcons.download className="theme-icon" />
                  )}
                </button>
              </div>
            </div>
            <div className="json-output-editor">
              <div
                className="json-line-gutter"
                ref={outputGutterRef}
                aria-hidden="true"
              >
                {outputLineNumbers.map((lineNumber) => (
                  <span key={lineNumber}>{lineNumber}</span>
                ))}
              </div>
              <pre
                ref={outputRef}
                className="json-output"
                onScroll={syncOutputScroll}
                aria-label="Formatted JSON output"
              >
                {isLoading ? (
                  "Loading JSON..."
                ) : formattedText ? (
                  renderJsonTokens(formattedText)
                ) : (
                  <span className="output-placeholder">
                    Formatted JSON appears here
                  </span>
                )}
              </pre>
            </div>
          </section>
        </div>

        <div
          className={`json-formatter-status status-${status.type}`}
          role={status.type === "invalid" ? "alert" : "status"}
          aria-live="polite"
        >
          <span className="status-indicator" aria-hidden="true" />
          <span>{status.message}</span>
          {feedback && <span className="status-feedback">{feedback}</span>}
        </div>
        {status.type === "invalid" && status.details && (
          <div className="json-formatter-error" role="alert">
            {status.details}
          </div>
        )}
        {isDragging && (
          <div className="json-formatter-drop-overlay" aria-live="polite">
            Drop JSON file here
          </div>
        )}
      </main>
    </div>
  );
};

export default JsonFormatter;
