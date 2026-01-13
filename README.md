# RAG System – Document Q&A with Google Docs, PDFs & Vector Search

A **Retrieval-Augmented Generation (RAG)** system that allows users to connect their Google account, ingest documents (PDF / DOCX / Google Docs), generate embeddings, store them in a vector database, and ask **accurate, context-grounded questions** using LLMs.

This project demonstrates a **real-world AI architecture**, not a demo chatbot.

---

## 🚀 Features

- 🔐 Google OAuth 2.0 authentication
- 📄 Fetch documents from **Google Drive / Google Docs**
- 📑 PDF & DOCX text extraction
- ✂️ Intelligent text chunking with overlap
- 🧠 Embedding generation (Ollama / OpenAI-compatible)
- 📦 Vector storage using **Pinecone**
- 🔍 Semantic search using cosine similarity
- 🤖 Answer generation using **RAG**
- 🧩 Workspace & document isolation
- 🛑 Hallucination-safe responses (context-only answers)

## 🧠 What is RAG?

**Retrieval-Augmented Generation** combines:
- **Information Retrieval** (vector similarity search)
- **Text Generation** (LLMs)

Instead of relying on model memory, the system:
1. Retrieves relevant document chunks
2. Passes them as context to the model
3. Forces answers to be grounded in actual data

This prevents hallucinations and enables **private, up-to-date knowledge**.

## 🛠 Tech Stack

### Backend
- Node.js
- Express.js
- Google APIs (Drive & Docs)
- Pinecone (Vector DB)
- Ollama (Local / Cloud LLM)
- PDF & DOCX parsers

### AI / ML
- Embeddings (768 / 1024 dim)
- Cosine similarity
- Chunking with overlap
- RAG prompt constraints


Create a `.env` file:

```env
PORT=

PINACONE_DB_LINK=
OLLAME_API_KEY=
OLLAME_BASE_URL=

GOOGLE_DOCS_KEY=xxxx
GOOGLE_DOCS_CLIEND_ID=
GOOGLE_DOCS_CLIENT_SECRET=
GOOGLE__SECRET_JSON=
PINECONE_DB=
