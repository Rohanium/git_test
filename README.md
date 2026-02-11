# Netlify Knowledge Base Chatbot

A RAG-powered chatbot deployed on Netlify. Upload documents to build a knowledge base, then chat with an AI that answers using your data.

## Architecture

```
User question → Embed → Pinecone (vector search) → Top-K chunks → Claude (LLM) → Answer
```

| Component | Technology |
|---|---|
| Frontend | Static HTML/CSS/JS |
| API | Netlify Functions (Node.js) |
| Vector DB | Pinecone |
| Embeddings | OpenAI `text-embedding-3-small` |
| LLM | Claude (Anthropic) |

## Setup

### 1. Create external accounts

- **Pinecone**: Create a free account at [pinecone.io](https://www.pinecone.io). Create an index named `knowledge-base` with dimension `1536` and `cosine` metric.
- **Anthropic**: Get an API key from [console.anthropic.com](https://console.anthropic.com).
- **OpenAI**: Get an API key from [platform.openai.com](https://platform.openai.com) (used only for embeddings).

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill in your keys:

```bash
cp .env.example .env
```

For production, add these as environment variables in **Netlify > Site settings > Environment variables**.

### 3. Install and run locally

```bash
npm install
npx netlify dev
```

### 4. Upload knowledge base data

There are **3 ways** to add data:

#### Option A: Admin UI (browser)
Go to `http://localhost:8888/admin.html` and either:
- Upload a `.txt` / `.md` / `.csv` file
- Paste text directly

#### Option B: CLI bulk ingestion
```bash
npm run ingest -- path/to/file1.txt path/to/file2.md
```

#### Option C: API call
```bash
curl -X POST http://localhost:8888/.netlify/functions/upload \
  -H "Content-Type: application/json" \
  -H "x-admin-password: YOUR_PASSWORD" \
  -d '{"title": "My Document", "text": "Your content here..."}'
```

### 5. Deploy to Netlify

```bash
npx netlify deploy --prod
```

Or connect the repo to Netlify for automatic deploys on push.

## Project Structure

```
├── public/               # Static frontend
│   ├── index.html        # Chat page
│   ├── admin.html        # Admin upload page
│   └── styles.css
├── netlify/functions/    # Serverless API
│   ├── chat.js           # RAG chat endpoint
│   ├── upload.js         # Document ingestion endpoint
│   └── documents.js      # List uploaded documents
├── lib/                  # Shared utilities
│   ├── chunker.js        # Text chunking logic
│   ├── embeddings.js     # OpenAI embeddings wrapper
│   └── pinecone.js       # Pinecone client
├── scripts/
│   └── ingest-local.js   # CLI bulk ingestion tool
├── netlify.toml          # Netlify configuration
└── .env.example          # Required environment variables
```
