const Anthropic = require("@anthropic-ai/sdk");
const { embedText } = require("../../lib/embeddings");
const { getIndex } = require("../../lib/pinecone");

const anthropic = new Anthropic();

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  try {
    const { message, history = [] } = JSON.parse(event.body);
    if (!message) {
      return { statusCode: 400, body: JSON.stringify({ error: "message is required" }) };
    }

    // 1. Embed the user's question
    const queryVector = await embedText(message);

    // 2. Search Pinecone for relevant chunks
    const index = getIndex();
    const results = await index.query({
      vector: queryVector,
      topK: 5,
      includeMetadata: true,
    });

    const context = results.matches
      .filter((m) => m.score > 0.3)
      .map((m) => m.metadata.text)
      .join("\n\n---\n\n");

    // 3. Build the prompt with retrieved context
    const systemPrompt = context
      ? `You are a helpful assistant. Answer the user's question using ONLY the context below. If the context doesn't contain enough information, say so honestly.\n\n<context>\n${context}\n</context>`
      : "You are a helpful assistant. No knowledge base documents have been uploaded yet, so let the user know they can add information via the Admin page.";

    // 4. Convert chat history to Claude message format
    const messages = [];
    for (const msg of history.slice(-10)) {
      messages.push({ role: msg.role, content: msg.content });
    }
    messages.push({ role: "user", content: message });

    // 5. Call Claude
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    const reply = response.content[0].text;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reply,
        sources: results.matches
          .filter((m) => m.score > 0.3)
          .map((m) => ({
            document: m.metadata.document || "unknown",
            score: Math.round(m.score * 100) / 100,
          })),
      }),
    };
  } catch (err) {
    console.error("Chat error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
