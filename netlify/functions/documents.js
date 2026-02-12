const { getIndex } = require("../../lib/pinecone");

/**
 * Lists distinct documents in the knowledge base.
 * Uses a broad searchRecords query to sample stored records,
 * then extracts unique document names from the results.
 */
exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  try {
    const index = getIndex();

    // Use searchRecords with a generic query to retrieve stored records
    const searchResponse = await index.searchRecords({
      query: {
        inputs: { text: "document" },
        topK: 1000,
      },
      fields: ["document", "uploadedAt", "chunkIndex"],
    });

    const hits = searchResponse.result?.hits || [];

    // Aggregate unique documents with their chunk counts
    const docMap = new Map();
    for (const hit of hits) {
      const doc = hit.fields?.document || "unknown";
      const existing = docMap.get(doc);
      if (existing) {
        existing.chunks += 1;
        const uploadedAt = hit.fields?.uploadedAt || "";
        if (uploadedAt > existing.uploadedAt) {
          existing.uploadedAt = uploadedAt;
        }
      } else {
        docMap.set(doc, {
          name: doc,
          chunks: 1,
          uploadedAt: hit.fields?.uploadedAt || "unknown",
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
      body: JSON.stringify({ error: err.message || "Failed to list documents" }),
    };
  }
};
