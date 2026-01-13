import index from "../config/pinecone.js";
import { createEmbedding } from "../services/embedding.service.js";
import { Ollama } from "ollama";

const getSearchResults = async (questionEmbedding, topK = 5, filter = {}) => {
  const result = await index.query({
    vector: questionEmbedding,
    topK,
    includeMetadata: true,
    filter: filter,
  });

  return result.matches.map((match) => ({
    score: match.score,
    text: match.metadata.text,
    docId: match.metadata.docId,
  }));
};

const handleRag = async (req, res) => {
  const { question, workspaceId } = req.body;

  const queryEmbedding = await createEmbedding(question);
  const filter = {
    workspaceId,
  };
  const queryResult = await getSearchResults(queryEmbedding, 5, filter);

  const context = queryResult.map((r) => r.text).join("\n\n");
  const ollama = new Ollama({
    host: process.env.OLLAME_BASE_URL,
    headers: {
      Authorization: `Bearer ${process.env.OLLAME_API_KEY}`,
    },
  });
  const response = await ollama.chat({
    model: "gpt-oss:20b",
    messages: [
      {
        role: "system",
        content: `
You are a factual extraction system.

Rules:
- Answer ONLY the question.
- Use ONLY the provided context.
- Do NOT mention the document.
- If the answer is not explicitly present, reply exactly:
"Not present in the document."
      `.trim(),
      },
      {
        role: "user",
        content: `
Context:
${context}

Question:
${question}
      `.trim(),
      },
    ],
    stream: false,
  });
  res.json({ answer: response.message.content });
};

export { handleRag };
