import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { formatJson } from "../../utils/jsonFormatter";
import uploadFile from "../../assets/images/upload-file.svg";
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

const renderHighlightedJson = (value) => {
  const tokenPattern =
    /"(?:\\.|[^"\\])*"|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|\b(?:true|false|null)\b/g;
  const parts = [];
  let lastIndex = 0;

  for (const match of value.matchAll(tokenPattern)) {
    const token = match[0];
    const tokenIndex = match.index;
    const isKey =
      token.startsWith('"') &&
      /^\s*:/.test(value.slice(tokenIndex + token.length));
    const tokenType = isKey
      ? "key"
      : token.startsWith('"')
        ? "string"
        : /^-?\d/.test(token)
          ? "number"
          : "literal";

    if (tokenIndex > lastIndex) {
      parts.push(value.slice(lastIndex, tokenIndex));
    }
    parts.push(
      <span
        className={`json-token json-token-${tokenType}`}
        key={tokenIndex}
      >
        {token}
      </span>,
    );
    lastIndex = tokenIndex + token.length;
  }

  if (lastIndex < value.length) {
    parts.push(value.slice(lastIndex));
  }

  return parts;
};

const EditorAction = ({ label, onClick, disabled, children }) => (
  <button
    type="button"
    className="icon-btn"
    aria-label={label}
    title={label}
    onClick={onClick}
    disabled={disabled}
  >
    {children}
  </button>
);

const JSONFormatter = () => {
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
    if (!file) {
      return "Only JSON files are supported.";
    }

    const fileName = file.name || "";
    const isJsonExtension = /\.json$/i.test(fileName);
    const isJsonMime = [
      "application/json",
      "text/json",
      "application/ld+json",
    ].includes(file.type);

    if (!isJsonExtension && !isJsonMime) {
      return "Only JSON files are supported.";
    }

    return "";
  }, []);

  const processJsonFile = useCallback(
    async (file) => {
      if (!file) {
        return;
      }

      const invalidReason = getJsonFileError(file);
      if (invalidReason) {
        updateStatus("invalid", "✕ Invalid JSON file", invalidReason);
        setFeedback("Only JSON files are supported.");
        return;
      }

      setFileName(file.name || DEFAULT_FILE_NAME);
      setIsLoading(true);

      try {
        const fileText = await file.text();
        setJsonText(fileText);

        if (!fileText.trim()) {
          setFormattedText("");
          updateStatus(EMPTY_STATUS.type, EMPTY_STATUS.message, "");
          setFeedback("Uploaded file is empty");
          return;
        }

        const result = formatJson(fileText);

        if (result.success) {
          setFormattedText(result.formatted);
          updateStatus("valid", "Valid JSON, formatted", "");
          setFeedback(`✓ ${file.name || "JSON file"} loaded`);
          return;
        }

        setFormattedText("");
        setStatus(formatErrorStatus(result));
        setFeedback("Invalid JSON file loaded");
      } catch (error) {
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
        updateStatus(EMPTY_STATUS.type, EMPTY_STATUS.message, "");
      } else {
        updateStatus("ready", "Ready to format", "");
      }
    },
    [updateStatus],
  );

  const handleFormat = useCallback(() => {
    if (!jsonText.trim()) {
      setFormattedText("");
      updateStatus(EMPTY_STATUS.type, EMPTY_STATUS.message, "");
      return;
    }

    const result = formatJson(jsonText);

    if (result.success) {
      const formatted = JSON.stringify(result.parsed, null, 2);
      setJsonText(formatted);
      setFormattedText(formatted);
      updateStatus("valid", "Valid JSON, formatted", "");
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
    updateStatus("valid", "Valid JSON, minified", "");
    setFeedback("JSON minified");
  }, [jsonText, updateStatus]);

  const handleClear = useCallback(() => {
    setJsonText("");
    setFormattedText("");
    setFileName(DEFAULT_FILE_NAME);
    setFeedback("");
    updateStatus(EMPTY_STATUS.type, EMPTY_STATUS.message, "");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [updateStatus]);

  const handleCopy = useCallback(async () => {
    const textToCopy = formattedText || jsonText;
    if (!textToCopy.trim()) {
      updateStatus(EMPTY_STATUS.type, EMPTY_STATUS.message, "");
      return;
    }

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = textToCopy;
        textArea.setAttribute("readonly", "");
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }

      setFeedback("JSON copied to clipboard");
    } catch (error) {
      setFeedback("Unable to copy JSON to clipboard");
    }
  }, [formattedText, jsonText, updateStatus]);

  const handleDownload = useCallback(() => {
    const result = formatJson(jsonText);
    if (!result.success) {
      if (!result.empty) {
        setStatus(formatErrorStatus(result));
      } else {
        updateStatus(EMPTY_STATUS.type, EMPTY_STATUS.message, "");
      }
      return;
    }

    try {
      const normalizedName = (fileName || DEFAULT_FILE_NAME).trim();
      const safeName = /\.json$/i.test(normalizedName)
        ? normalizedName
        : `${normalizedName || DEFAULT_FILE_NAME}.json`;
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
    } catch (error) {
      setFeedback("Download failed");
    }
  }, [fileName, formattedText, jsonText, updateStatus]);

  const handleFileUpload = useCallback(
    async (event) => {
      const file = event.target.files && event.target.files[0];
      if (!file) {
        return;
      }

      await processJsonFile(file);
      event.target.value = "";
    },
    [processJsonFile],
  );

  const handleDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event) => {
    if (event.currentTarget.contains(event.relatedTarget)) {
      return;
    }
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (event) => {
      event.preventDefault();
      setIsDragging(false);

      const droppedFile =
        event.dataTransfer &&
        event.dataTransfer.files &&
        event.dataTransfer.files[0];
      if (!droppedFile) {
        return;
      }

      await processJsonFile(droppedFile);
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
    <div className="formatter-page">
      <header className="formatter-heading">
        <h1>JSON Formatter</h1>
      </header>

      <div className="container formatter-container">
        <div className="formatter-toolbar">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={handleFileUpload}
          />

          <div
            className={`upload-dropzone ${isDragging ? "dragging" : ""}`}
            onDragEnter={handleDragOver}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <button
              type="button"
              className="btn"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Upload JSON file"
            >
              <span
                className="upload-icon"
                aria-hidden="true"
              >
                <img
                  src={uploadFile}
                  alt="Upload File"
                />
              </span>
              Browse JSON
            </button>
            <span className="upload-hint">Drop a .json file here"</span>
          </div>

          <button
            type="button"
            className="btn primary"
            onClick={handleFormat}
            disabled={isLoading || !jsonText.trim()}
          >
            Format
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleClear}
            disabled={isLoading}
          >
            Clear
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleMinify}
            disabled={isLoading || !jsonText.trim()}
          >
            Minify
          </button>
        </div>

        <div
          className={`editor-dropzone ${isDragging ? "dragging" : ""} ${status.type === "invalid" ? "has-error" : ""}`}
          onDragEnter={handleDragOver}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {isDragging && (
            <div
              className="drop-overlay"
              aria-live="polite"
            >
              <span>Drop JSON file here</span>
            </div>
          )}

          <div className="editor-shell">
            <section
              className="json-pane input-pane"
              aria-label="JSON input"
            >
              <div className="pane-heading">
                <div className="pane-title">
                  <strong>Input</strong>
                  <span>Paste JSON here</span>
                </div>
              </div>
              <div className="pane-editor">
                <div
                  className="line-gutter"
                  ref={gutterRef}
                  aria-hidden="true"
                >
                  {lineNumbers.map((lineNumber) => (
                    <span
                      key={lineNumber}
                      className={`line-number ${errorLine === lineNumber ? "error" : ""}`}
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
              className="json-pane output-pane"
              aria-label="Formatted JSON"
            >
              <div className="pane-heading">
                <div className="pane-title">
                  <strong>Formatted</strong>
                  <span>Read-only</span>
                </div>
                <div className="pane-actions">
                  <EditorAction
                    label="Copy JSON"
                    onClick={handleCopy}
                    disabled={!formattedText && !jsonText.trim()}
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
                  </EditorAction>
                  <EditorAction
                    label="Download JSON"
                    onClick={handleDownload}
                    disabled={!jsonText.trim()}
                  >
                    <svg
                      aria-hidden="true"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <path
                        d="M12 3a1 1 0 0 1 1 1v9.59l3.3-3.3a1 1 0 1 1 1.4 1.42l-5 5a1 1 0 0 1-1.4 0l-5-5a1 1 0 1 1 1.4-1.42L11 13.59V4a1 1 0 0 1 1-1Zm-7 14a1 1 0 0 1 1 1v1h12v-1a1 1 0 1 1 2 0v1a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-1a1 1 0 0 1 1-1Z"
                        fill="currentColor"
                      />
                    </svg>
                  </EditorAction>
                </div>
              </div>
              <div className="pane-editor output-editor">
                <div
                  className="line-gutter output-gutter"
                  ref={outputGutterRef}
                  aria-hidden="true"
                >
                  {outputLineNumbers.map((lineNumber) => (
                    <span
                      key={lineNumber}
                      className="line-number"
                    >
                      {lineNumber}
                    </span>
                  ))}
                </div>
                <pre
                  ref={outputRef}
                  className="json-output"
                  onScroll={syncOutputScroll}
                  aria-label="Formatted JSON output"
                >
                  {isLoading ? (
                    "Loading JSON…"
                  ) : formattedText ? (
                    renderHighlightedJson(formattedText)
                  ) : (
                    <span className="output-placeholder">
                      Formatted JSON appears here
                    </span>
                  )}
                </pre>
              </div>
            </section>
          </div>
        </div>

        <div
          className={`status-banner status-${status.type}`}
          role="status"
          aria-live="polite"
        >
          <span
            className="status-dot"
            aria-hidden="true"
          />
          <span className="status-message">{status.message}</span>
          {feedback ? <span className="toast">{feedback}</span> : null}
        </div>

        {status.type === "invalid" && status.details ? (
          <div
            className="validation-error"
            role="alert"
          >
            {status.details}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default JSONFormatter;
