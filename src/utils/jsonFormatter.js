const getLineAndColumn = (value, position) => {
  if (!Number.isInteger(position) || position < 0 || position > value.length) {
    return null;
  }

  const before = value.slice(0, position);
  const line = before.split("\n").length;
  const lastNewLineIndex = before.lastIndexOf("\n");
  const column =
    lastNewLineIndex === -1
      ? before.length + 1
      : before.length - lastNewLineIndex;

  return { line, column };
};

const parseJsonError = (input, error) => {
  const message = error && error.message ? error.message : "Invalid JSON";
  const positionMatch = message.match(/position\s+(\d+)/i);
  const position = positionMatch ? Number(positionMatch[1]) : null;
  const lineInfo = position !== null ? getLineAndColumn(input, position) : null;

  const tokenMatch = message.match(/Unexpected token\s+([^\s]+)/i);
  const prefix = tokenMatch ? `Unexpected token ${tokenMatch[1]}` : message;
  const cleaned = prefix
    .replace(/\s+in JSON$/i, "")
    .replace(/\s+at position\s+\d+$/i, "")
    .replace(/\s+at\s+position\s+\d+$/i, "");

  if (lineInfo) {
    return {
      message: `${cleaned} at line ${lineInfo.line}, column ${lineInfo.column}`,
      line: lineInfo.line,
      column: lineInfo.column,
    };
  }

  return {
    message: cleaned,
    line: null,
    column: null,
  };
};

export const formatJson = (input = "") => {
  const value = typeof input === "string" ? input : "";

  if (!value.trim()) {
    return {
      success: false,
      empty: true,
      error: "Enter or upload JSON data",
      line: null,
      column: null,
    };
  }

  try {
    const parsed = JSON.parse(value);
    const formatted = JSON.stringify(parsed, null, 2);

    return {
      success: true,
      formatted,
      parsed,
      line: null,
      column: null,
    };
  } catch (error) {
    const errorInfo = parseJsonError(value, error);
    const positionMatch = (error && error.message ? error.message : "").match(
      /position\s+(\d+)/i,
    );
    const position = positionMatch ? Number(positionMatch[1]) : null;

    return {
      success: false,
      error: errorInfo.message,
      position,
      line: errorInfo.line,
      column: errorInfo.column,
    };
  }
};

export const validateJson = (input = "") => {
  const result = formatJson(input);
  return {
    valid: result.success,
    ...result,
  };
};
