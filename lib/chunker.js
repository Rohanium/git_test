/**
 * Splits text into overlapping chunks suitable for embedding.
 *
 * Strategy:
 *  1. Split on double-newlines first, then single newlines as fallback.
 *  2. Merge small sections together until we approach maxChars.
 *  3. Force-split any section that still exceeds maxChars.
 *  4. Keep an overlap so context isn't lost between chunks.
 */

const MAX_CHARS = 1500; // ~375 tokens at 4 chars/token
const OVERLAP_CHARS = 200;

function chunkText(text, { maxChars = MAX_CHARS, overlap = OVERLAP_CHARS } = {}) {
  // Split into sections: prefer double-newline, fall back to single newline
  let sections = text.split(/\n{2,}/);
  if (sections.length <= 1) {
    sections = text.split(/\n/);
  }

  // Force-split any section that still exceeds maxChars
  const splitSections = [];
  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed) continue;
    if (trimmed.length <= maxChars) {
      splitSections.push(trimmed);
    } else {
      // Hard split at maxChars boundaries on whitespace
      let remaining = trimmed;
      while (remaining.length > maxChars) {
        let splitAt = remaining.lastIndexOf(" ", maxChars);
        if (splitAt <= 0) splitAt = maxChars;
        splitSections.push(remaining.slice(0, splitAt).trim());
        remaining = remaining.slice(splitAt).trim();
      }
      if (remaining) splitSections.push(remaining);
    }
  }

  const chunks = [];
  let current = "";

  for (const section of splitSections) {
    if (current.length + section.length + 1 > maxChars && current.length > 0) {
      chunks.push(current.trim());
      // keep the tail as overlap for the next chunk
      current = current.slice(-overlap) + "\n\n" + section;
    } else {
      current += (current ? "\n\n" : "") + section;
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks;
}

module.exports = { chunkText };
