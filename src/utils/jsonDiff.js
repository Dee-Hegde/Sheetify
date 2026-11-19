const isJsonObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export const findJsonDifferencePaths = (left, right, path = []) => {
  if (Object.is(left, right)) return [];

  if (Array.isArray(left) && Array.isArray(right)) {
    const changedPaths = [];
    const length = Math.max(left.length, right.length);
    for (let index = 0; index < length; index += 1) {
      const itemPath = [...path, index];
      if (index >= left.length) {
        changedPaths.push(itemPath);
      } else if (index >= right.length) {
        changedPaths.push(itemPath);
      } else {
        changedPaths.push(
          ...findJsonDifferencePaths(left[index], right[index], itemPath),
        );
      }
    }
    return changedPaths;
  }

  if (isJsonObject(left) && isJsonObject(right)) {
    const changedPaths = [];
    const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
    for (const key of keys) {
      const itemPath = [...path, key];
      const hasLeft = Object.prototype.hasOwnProperty.call(left, key);
      const hasRight = Object.prototype.hasOwnProperty.call(right, key);
      if (!hasLeft) {
        changedPaths.push(itemPath);
      } else if (!hasRight) {
        changedPaths.push(itemPath);
      } else {
        changedPaths.push(
          ...findJsonDifferencePaths(left[key], right[key], itemPath),
        );
      }
    }
    return changedPaths;
  }

  return [path];
};

export const diffTextLines = (leftText, rightText) => {
  const leftLines = String(leftText).split(/\r\n|\n|\r/);
  const rightLines = String(rightText).split(/\r\n|\n|\r/);
  const leftChanged = new Set();
  const rightChanged = new Set();

  let prefix = 0;
  while (
    prefix < leftLines.length &&
    prefix < rightLines.length &&
    leftLines[prefix] === rightLines[prefix]
  ) {
    prefix += 1;
  }

  let suffix = 0;
  while (
    suffix < leftLines.length - prefix &&
    suffix < rightLines.length - prefix &&
    leftLines[leftLines.length - 1 - suffix] ===
      rightLines[rightLines.length - 1 - suffix]
  ) {
    suffix += 1;
  }

  const leftMiddle = leftLines.slice(prefix, leftLines.length - suffix);
  const rightMiddle = rightLines.slice(prefix, rightLines.length - suffix);
  const leftLength = leftMiddle.length;
  const rightLength = rightMiddle.length;
  const maxCells = 2000000;

  if (leftLength * rightLength > maxCells) {
    for (let index = 0; index < leftLength; index += 1) {
      leftChanged.add(prefix + index);
    }
    for (let index = 0; index < rightLength; index += 1) {
      rightChanged.add(prefix + index);
    }
    return { leftLines, rightLines, leftChanged, rightChanged };
  }

  const width = rightLength + 1;
  const lcs = new Uint32Array((leftLength + 1) * width);
  for (let leftIndex = leftLength - 1; leftIndex >= 0; leftIndex -= 1) {
    for (
      let rightIndex = rightLength - 1;
      rightIndex >= 0;
      rightIndex -= 1
    ) {
      const cell = leftIndex * width + rightIndex;
      lcs[cell] =
        leftMiddle[leftIndex] === rightMiddle[rightIndex]
          ? lcs[cell + width + 1] + 1
          : Math.max(
              lcs[cell + width],
              lcs[cell + 1],
            );
    }
  }

  let leftIndex = 0;
  let rightIndex = 0;
  while (leftIndex < leftLength && rightIndex < rightLength) {
    if (leftMiddle[leftIndex] === rightMiddle[rightIndex]) {
      leftIndex += 1;
      rightIndex += 1;
    } else if (
      lcs[(leftIndex + 1) * width + rightIndex] >=
      lcs[leftIndex * width + rightIndex + 1]
    ) {
      leftChanged.add(prefix + leftIndex);
      leftIndex += 1;
    } else {
      rightChanged.add(prefix + rightIndex);
      rightIndex += 1;
    }
  }

  while (leftIndex < leftLength) {
    leftChanged.add(prefix + leftIndex);
    leftIndex += 1;
  }
  while (rightIndex < rightLength) {
    rightChanged.add(prefix + rightIndex);
    rightIndex += 1;
  }

  return { leftLines, rightLines, leftChanged, rightChanged };
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const getStructuralChangedLines = (text, changedPaths, fallbackLines) => {
  const lines = String(text).split(/\r\n|\n|\r/);
  const changedLines = new Set();

  changedPaths.forEach((path) => {
    const lastProperty = [...path]
      .reverse()
      .find((segment) => typeof segment === "string");
    if (lastProperty === undefined) {
      fallbackLines.forEach((line) => changedLines.add(line));
      return;
    }

    const propertyPattern = new RegExp(
      `${escapeRegExp(JSON.stringify(lastProperty))}\\s*:`,
    );
    lines.forEach((line, index) => {
      if (propertyPattern.test(line)) changedLines.add(index);
    });
  });

  return changedLines;
};
