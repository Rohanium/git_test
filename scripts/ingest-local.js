#!/usr/bin/env node

/**
 * Bulk-ingest local files into the knowledge base from the command line.
 *
 * Usage:
 *   node scripts/ingest-local.js path/to/file1.txt path/to/file2.md ...
 *
 * Requires PINECONE_API_KEY and PINECONE_INDEX env vars
 * (load via .env file or export them).
 *
 * Uses Pinecone integrated embeddings — text is embedded automatically on upsert.
 */

require("dotenv/config");

const fs = require("fs");
const path = require("path");
const { chunkText } = require("../lib/chunker");
const { getIndex } = require("../lib/pinecone");

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

async function ingestFile(filePath) {
  const name = path.basename(filePath);
  const text = fs.readFileSync(filePath, "utf-8");

  console.log(`Processing "${name}" (${text.length} chars)...`);

  const chunks = chunkText(text);
  console.log(`  -> ${chunks.length} chunks`);

  const index = getIndex();

  const records = chunks.map((chunk, i) => ({
    id: `${slugify(name)}-${i}-${Date.now()}`,
    text: chunk,
    document: name,
    chunkIndex: i,
    uploadedAt: new Date().toISOString(),
  }));

  // Pinecone integrated embeddings: use small batches with delays
  // to stay under the free tier rate limit (250k tokens/min)
  const BATCH_SIZE = 10;
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    await index.upsertRecords({ records: records.slice(i, i + BATCH_SIZE) });
    if (i + BATCH_SIZE < records.length) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  console.log(`  -> Uploaded to Pinecone.`);
}

async function main() {
  const files = process.argv.slice(2);
  if (files.length === 0) {
    console.log("Usage: node scripts/ingest-local.js <file1> <file2> ...");
    process.exit(1);
  }

  for (const file of files) {
    await ingestFile(file);
  }

  console.log("Done!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
