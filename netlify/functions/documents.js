const { getIndex } = require("../../lib/pinecone");

/**
 * Lists distinct documents in the knowledge base.
 * Uses a zero-vector query with a large topK to sample stored records,
 * then extracts unique document names from metadata.
 */
exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  try {
    const index = getIndex();

    // Query with a zero vector to get a sample of all records
    const zeroVector = new Array(1536).fill(0);
    const results = await index.query({
      vector: zeroVector,
      topK: 1000,
      includeMetadata: true,
    });

    // Aggregate unique documents with their chunk counts
    const docMap = new Map();
    for (const match of results.matches) {
      const doc = match.metadata.document || "unknown";
      const existing = docMap.get(doc);
      if (existing) {
        existing.chunks += 1;
        if (match.metadata.uploadedAt > existing.uploadedAt) {
          existing.uploadedAt = match.metadata.uploadedAt;
        }
      } else {
        docMap.set(doc, {
          name: doc,
          chunks: 1,
          uploadedAt: match.metadata.uploadedAt || "unknown",
        });
      }
    }

    const documents = Array.from(docMap.values()).sort(
      (a, b) => b.uploadedAt.localeCompare(a.uploadedAt)
    );

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documents }),
    };
  } catch (err) {
    console.error("Documents list error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to list documents" }),
    };
  }
};
