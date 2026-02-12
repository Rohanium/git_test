const { getIndex } = require("../../lib/pinecone");

/**
 * Deletes all chunks belonging to a document by name.
 * Uses listPaginated to find record IDs, then deletes them.
 */
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const password = event.headers["x-admin-password"];
  if (process.env.ADMIN_PASSWORD && password !== process.env.ADMIN_PASSWORD) {
    return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  try {
    const { document } = JSON.parse(event.body);
    if (!document) {
      return { statusCode: 400, body: JSON.stringify({ error: "document name is required" }) };
    }

    const index = getIndex();

    // Search for all chunks belonging to this document
    const searchResponse = await index.searchRecords({
      query: {
        inputs: { text: document },
        topK: 1000,
      },
      fields: ["document"],
    });

    const hits = searchResponse.result?.hits || [];
    const idsToDelete = hits
      .filter((h) => h.fields?.document === document)
      .map((h) => h._id);

    if (idsToDelete.length === 0) {
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Document not found" }),
      };
    }

    // Delete in batches of 100
    for (let i = 0; i < idsToDelete.length; i += 100) {
      await index.deleteMany(idsToDelete.slice(i, i + 100));
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        success: true,
        document,
        deletedChunks: idsToDelete.length,
      }),
    };
  } catch (err) {
    console.error("Delete error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || "Failed to delete document" }),
    };
  }
};
