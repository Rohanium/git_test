const busboy = require("busboy");
const { chunkText } = require("../../lib/chunker");
const { getIndex } = require("../../lib/pinecone");

/**
 * Upload endpoint — accepts:
 *   - multipart/form-data with a "file" field (plain text / .txt / .md / .csv)
 *   - OR JSON body with { "title": "...", "text": "..." }
 *
 * Protected by ADMIN_PASSWORD (sent as x-admin-password header).
 * Uses Pinecone integrated embeddings — text is embedded automatically on upsert.
 */
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  // Simple auth check
  const password = event.headers["x-admin-password"];
  if (process.env.ADMIN_PASSWORD && password !== process.env.ADMIN_PASSWORD) {
    return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  try {
    let title, text;

    const contentType = event.headers["content-type"] || "";

    if (contentType.includes("multipart/form-data")) {
      // Parse file upload
      ({ title, text } = await parseMultipart(event));
    } else {
      // JSON body
      const body = JSON.parse(event.body);
      title = body.title;
      text = body.text;
    }

    if (!text || !text.trim()) {
      return { statusCode: 400, body: JSON.stringify({ error: "No text content provided" }) };
    }

    title = title || `Upload ${new Date().toISOString()}`;

    // 1. Chunk the document
    const chunks = chunkText(text);

    // 2. Upsert into Pinecone using integrated embeddings
    //    Records contain a "text" field matching the index field_map,
    //    so Pinecone embeds them automatically.
    const index = getIndex();
    const records = chunks.map((chunk, i) => ({
      id: `${slugify(title)}-${i}-${Date.now()}`,
      text: chunk,
      document: title,
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

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        success: true,
        document: title,
        chunks: chunks.length,
      }),
    };
  } catch (err) {
    console.error("Upload error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || "Failed to process upload" }),
    };
  }
};

// --- Helpers ---

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function parseMultipart(event) {
  return new Promise((resolve, reject) => {
    const bb = busboy({ headers: event.headers });
    let title = "";
    let text = "";

    bb.on("field", (name, val) => {
      if (name === "title") title = val;
    });

    bb.on("file", (_name, stream, info) => {
      if (!title) title = info.filename || "Untitled";
      const parts = [];
      stream.on("data", (chunk) => parts.push(chunk));
      stream.on("end", () => {
        text = Buffer.concat(parts).toString("utf-8");
      });
    });

    bb.on("finish", () => resolve({ title, text }));
    bb.on("error", reject);

    const body = event.isBase64Encoded
      ? Buffer.from(event.body, "base64")
      : Buffer.from(event.body);
    bb.end(body);
  });
}
