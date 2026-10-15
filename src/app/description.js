// Old textarea checklists used "[x] - item" inline. Convert only that legacy
// syntax; modern Markdown and code samples retain their original meaning.
export function normalizeDescription(value) {
  let fence = null;
  return String(value || "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => {
      const marker = line.match(/^\s{0,3}(`{3,}|~{3,})/);
      if (marker) {
        if (!fence) fence = marker[1];
        else if (marker[1][0] === fence[0] && marker[1].length >= fence.length)
          fence = null;
        return line;
      }
      if (fence || /^(?: {4}|\t)/.test(line) || line.includes("`")) return line;
      return line.replace(
        /(^|[ \t]+)\[([xX ])\][ \t]+-[ \t]+/g,
        (match, space, checked, offset) => {
          const prefix = line.slice(0, offset).trim();
          if (/^(?:[-*+]|\d+[.)])$/.test(prefix)) return match;
          return `${prefix ? "\n" : ""}- [${checked.toLowerCase()}] `;
        },
      );
    })
    .join("\n");
}
