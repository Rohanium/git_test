const { getIndex } = require("../../lib/pinecone");

/**
 * Returns the text chunks for a specific document.
 */
exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  try {
    const docName = event.queryStringParameters?.document;
    if (!docName) {
      return { statusCode: 400, body: JSON.stringify({ error: "document param is required" }) };
    }

    const index = getIndex();

    const searchResponse = await index.searchRecords({
      query: {
        inputs: { text: docName },
        topK: 200,
      },
      fields: ["text", "document", "chunkIndex", "uploadedAt"],
    });

    const hits = searchResponse.result?.hits || [];
    const chunks = hits
      .filter((h) => h.fields?.document === docName)
      .sort((a, b) => (a.fields?.chunkIndex || 0) - (b.fields?.chunkIndex || 0))
      .map((h) => ({
        id: h._id,
        text: h.fields?.text || "",
        chunkIndex: h.fields?.chunkIndex,
        uploadedAt: h.fields?.uploadedAt,
      }));

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ document: docName, chunks }),
    };
  } catch (err) {
    console.error("Document chunks error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || "Failed to get document chunks" }),
    };
  }
};
