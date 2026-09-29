import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { formatJson } from "../../utils/jsonFormatter";
import "./jsonFormatter.css";

const DEFAULT_FILE_NAME = "formatted-data.json";
const DEFAULT_EMPTY_STATUS = {
  type: "empty",
  message: "Enter or upload JSON data",
  details: "",
};

const EXAMPLE_JSON = `{
  "name": "John Doe",
  "age": 30,
  "skills": ["JavaScript", "React"],
  "address": {
    "city": "Mysore",
    "country": "India"
  }
}`;

const JSONFormatter = () => {
  const fileInputRef = useRef(null);
  const editorRef = useRef(null);
  const gutterRef = useRef(null);
  const [jsonText, setJsonText] = useState("");
  const [status, setStatus] = useState(DEFAULT_EMPTY_STATUS);
  const [feedback, setFeedback] = useState("");
  const [fileName, setFileName] = useState(DEFAULT_FILE_NAME);
  const [isDragging, setIsDragging] = useState(false);

  const lineNumbers = useMemo(() => {
    const totalLines = Math.max(jsonText.split(/\r\n|\r|\n/).length, 1);
    return Array.from({ length: totalLines }, (_, index) => index + 1);
  }, [jsonText]);

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

      try {
        const fileText = await file.text();
        setJsonText(fileText);

        if (!fileText.trim()) {
          updateStatus("empty", "Enter or upload JSON data", "");
          setFeedback("✕ Uploaded file is empty");
          return;
        }

        const result = formatJson(fileText);

        if (result.success) {
          updateStatus("valid", "✓ Valid JSON", "");
          setFeedback(`✓ ${file.name || "JSON file"} loaded`);
          return;
        }

        updateStatus(
          "invalid",
          "✕ Invalid JSON",
          result.error || "The JSON could not be parsed.",
        );
        setFeedback("✕ Invalid JSON file loaded");
      } catch (error) {
        updateStatus(
          "invalid",
          "✕ File read failed",
          "The selected file could not be read.",
        );
        setFeedback("✕ Unable to read file");
      }
    },
    [getJsonFileError, updateStatus],
  );

  const validateText = useCallback(
    (nextText) => {
      const trimmed = nextText.trim();

      if (!trimmed) {
        updateStatus("empty", "Enter or upload JSON data", "");
        return false;
      }

      const result = formatJson(nextText);

      if (result.success) {
        updateStatus("valid", "✓ Valid JSON", "");
        return true;
      }

      updateStatus(
        "invalid",
        "✕ Invalid JSON",
        result.error || "The JSON could not be parsed.",
      );
      return false;
    },
    [updateStatus],
  );

  const handleEditorChange = useCallback(
    (event) => {
      const nextText = event.target.value;
      setJsonText(nextText);
      setFeedback("");

      if (!nextText.trim()) {
        updateStatus("empty", "Enter or upload JSON data", "");
      }
    },
    [updateStatus],
  );

  const handleFormat = useCallback(() => {
    if (!jsonText.trim()) {
      updateStatus("empty", "Enter or upload JSON data", "");
      return;
    }

    const result = formatJson(jsonText);

    if (result.success) {
      setJsonText(result.formatted);
      updateStatus("valid", "✓ Valid JSON", "");
      setFeedback("✓ JSON formatted");
      return;
    }

    updateStatus(
      "invalid",
      "✕ Invalid JSON",
      result.error || "The JSON could not be parsed.",
    );
    setFeedback("");
  }, [jsonText, updateStatus]);

  const handleClear = useCallback(() => {
    setJsonText("");
    setFileName(DEFAULT_FILE_NAME);
    setFeedback("");
    updateStatus("empty", "Enter or upload JSON data", "");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [updateStatus]);

  const handleCopy = useCallback(async () => {
    if (!jsonText.trim()) {
      updateStatus("empty", "Enter or upload JSON data", "");
      return;
    }

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(jsonText);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = jsonText;
        textArea.setAttribute("readonly", "");
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }

      setFeedback("✓ JSON copied to clipboard");
    } catch (error) {
      setFeedback("✕ Unable to copy JSON to clipboard");
    }
  }, [jsonText, updateStatus]);

  const handleDownload = useCallback(() => {
    if (!jsonText.trim()) {
      updateStatus("empty", "Enter or upload JSON data", "");
      return;
    }

    try {
      const normalizedName = (fileName || DEFAULT_FILE_NAME).trim();
      const safeName = /\.json$/i.test(normalizedName)
        ? normalizedName
        : `${normalizedName || DEFAULT_FILE_NAME}.json`;
      const blob = new Blob([jsonText], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = safeName;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setFeedback(`✓ ${safeName} downloaded`);
    } catch (error) {
      setFeedback("✕ Download failed");
    }
  }, [fileName, jsonText, updateStatus]);

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

  useEffect(() => {
    const editor = editorRef.current;
    const gutter = gutterRef.current;

    if (!editor || !gutter) {
      return undefined;
    }

    const syncScroll = () => {
      gutter.scrollTop = editor.scrollTop;
    };

    editor.addEventListener("scroll", syncScroll);
    return () => editor.removeEventListener("scroll", syncScroll);
  }, [jsonText]);

  const errorLine =
    status.type === "invalid" && status.details
      ? Number((status.details.match(/line\s+(\d+)/i) || [])[1]) || null
      : null;

  return (
    <div className="formatter-page">
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
              Upload JSON
            </button>
            <span className="upload-hint">
              {isDragging
                ? "Drop JSON file here"
                : "Drag & drop JSON file here"}
            </span>
          </div>

          <button
            type="button"
            className="btn primary"
            onClick={handleFormat}
          >
            Format
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleClear}
          >
            Clear
          </button>
        </div>

        <div
          className={`editor-dropzone ${isDragging ? "dragging" : ""}`}
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
            {!jsonText.trim() && !isDragging && (
              <div className="editor-header">
                <div
                  className="empty-state"
                  aria-live="polite"
                >
                  <strong>No JSON data</strong>
                  <span>Paste JSON here.</span>
                </div>

                <div
                  className="editor-actions"
                  aria-label="JSON editor actions"
                >
                  <button
                    type="button"
                    aria-label="Copy JSON"
                    title="Copy JSON"
                    className={`icon-btn ${jsonText.trim() ? "" : "disabled"}`}
                    onClick={handleCopy}
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
                        d="M16 1H4a2 2 0 0 0-2 2v12h2V3h12V1Zm4 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 16H8V7h12v14Z"
                        fill="currentColor"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    aria-label="Download JSON"
                    title="Download JSON"
                    className={`icon-btn ${jsonText.trim() ? "" : "disabled"}`}
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
                  </button>
                </div>
              </div>
            )}

            {jsonText.trim() && (
              <div
                className="editor-actions editor-actions-floating"
                aria-label="JSON editor actions"
              >
                <button
                  type="button"
                  aria-label="Copy JSON"
                  title="Copy JSON"
                  className="icon-btn"
                  onClick={handleCopy}
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
                <button
                  type="button"
                  aria-label="Download JSON"
                  title="Download JSON"
                  className="icon-btn"
                  onClick={handleDownload}
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
                </button>
              </div>
            )}

            <div className="editor-with-gutter">
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
                onScroll={() => {
                  if (gutterRef.current && editorRef.current) {
                    gutterRef.current.scrollTop = editorRef.current.scrollTop;
                  }
                }}
                placeholder={EXAMPLE_JSON}
                spellCheck={false}
                aria-label="JSON editor"
              />
            </div>
          </div>
        </div>

        <div
          className={`status-banner status-${status.type}`}
          role="status"
          aria-live="polite"
        >
          {status.message}
        </div>

        {status.type === "invalid" && status.details ? (
          <div
            className="validation-error"
            role="alert"
          >
            {status.details}
          </div>
        ) : null}

        {feedback ? <div className="toast">{feedback}</div> : null}
      </div>
    </div>
  );
};

export default JSONFormatter;
