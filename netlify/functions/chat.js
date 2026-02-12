const Anthropic = require("@anthropic-ai/sdk");
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

    // 1. Search Pinecone using integrated embeddings (text query)
    const index = getIndex();
    const searchResponse = await index.searchRecords({
      query: {
        inputs: { text: message },
        topK: 5,
      },
      fields: ["text", "document"],
    });

    // llama-text-embed-v2 produces lower scores than OpenAI embeddings,
    // so use a low threshold to avoid filtering out relevant results
    const hits = (searchResponse.result?.hits || []).filter((h) => h._score > 0.05);

    const context = hits
      .map((h) => h.fields?.text)
      .filter(Boolean)
      .join("\n\n---\n\n");

    // 2. Build the prompt with retrieved context
    const systemPrompt = context
      ? `You are a helpful assistant. Answer the user's question using ONLY the context below. If the context doesn't contain enough information, say so honestly.\n\n<context>\n${context}\n</context>`
      : "You are a helpful assistant. No knowledge base documents have been uploaded yet, so let the user know they can add information via the Admin page.";

    // 3. Convert chat history to Claude message format
    const messages = [];
    for (const msg of history.slice(-10)) {
      messages.push({ role: msg.role, content: msg.content });
    }
    messages.push({ role: "user", content: message });

    // 4. Call Claude
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
        sources: hits.map((h) => ({
          document: h.fields?.document || "unknown",
          score: Math.round(h._score * 100) / 100,
        })),
      }),
    };
  } catch (err) {
    console.error("Chat error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || "Internal server error" }),
    };
  }
};
