const { Pinecone } = require("@pinecone-database/pinecone");

let _client;

function getClient() {
  if (!_client) {
    _client = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  }
  return _client;
}

function getIndex() {
  const indexName = process.env.PINECONE_INDEX || "knowledge-base";
  return getClient().index(indexName);
}

module.exports = { getClient, getIndex };
