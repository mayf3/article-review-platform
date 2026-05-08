export type DiffLineType = "context" | "added" | "removed";

export interface DiffLine {
  type: DiffLineType;
  text: string;
  oldLine?: number;
  newLine?: number;
}

export function createLineDiff(fromContent: string, toContent: string): DiffLine[] {
  const fromLines = fromContent.split(/\r?\n/);
  const toLines = toContent.split(/\r?\n/);
  const rows = fromLines.length + 1;
  const cols = toLines.length + 1;
  const matrix: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (let i = fromLines.length - 1; i >= 0; i -= 1) {
    for (let j = toLines.length - 1; j >= 0; j -= 1) {
      matrix[i][j] =
        fromLines[i] === toLines[j]
          ? matrix[i + 1][j + 1] + 1
          : Math.max(matrix[i + 1][j], matrix[i][j + 1]);
    }
  }

  const result: DiffLine[] = [];
  let i = 0;
  let j = 0;

  while (i < fromLines.length && j < toLines.length) {
    if (fromLines[i] === toLines[j]) {
      result.push({
        type: "context",
        text: fromLines[i],
        oldLine: i + 1,
        newLine: j + 1
      });
      i += 1;
      j += 1;
    } else if (matrix[i + 1][j] >= matrix[i][j + 1]) {
      result.push({
        type: "removed",
        text: fromLines[i],
        oldLine: i + 1
      });
      i += 1;
    } else {
      result.push({
        type: "added",
        text: toLines[j],
        newLine: j + 1
      });
      j += 1;
    }
  }

  while (i < fromLines.length) {
    result.push({ type: "removed", text: fromLines[i], oldLine: i + 1 });
    i += 1;
  }

  while (j < toLines.length) {
    result.push({ type: "added", text: toLines[j], newLine: j + 1 });
    j += 1;
  }

  return result;
}
