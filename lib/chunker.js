/**
 * Splits text into overlapping chunks suitable for embedding.
 *
 * Strategy:
 *  1. Split on double-newlines (paragraphs) first.
 *  2. Merge small paragraphs together until we approach maxTokens.
 *  3. Keep an overlap so context isn't lost between chunks.
 */

const MAX_CHARS = 1500; // ~375 tokens at 4 chars/token
const OVERLAP_CHARS = 200;

function chunkText(text, { maxChars = MAX_CHARS, overlap = OVERLAP_CHARS } = {}) {
  const paragraphs = text.split(/\n{2,}/);
  const chunks = [];
  let current = "";

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    if (current.length + trimmed.length + 1 > maxChars && current.length > 0) {
      chunks.push(current.trim());
      // keep the tail as overlap for the next chunk
      current = current.slice(-overlap) + "\n\n" + trimmed;
    } else {
      current += (current ? "\n\n" : "") + trimmed;
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks;
}

module.exports = { chunkText };
