import index from "../config/pinecone.js";
import { createEmbedding } from "../services/embedding.service.js";
import { Ollama } from "ollama";

const ollama = new Ollama({
  host: process.env.OLLAME_BASE_URL,
  headers: {
    Authorization: `Bearer ${process.env.OLLAME_API_KEY}`,
  },
});

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
  console.log("queryResult", queryResult);
  const context = queryResult.map((r) => r.text).join("\n\n");

  console.log("context", context);

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

const handleInsights = async (req, res) => {
  try {
    const { insightData } = req.body;
    const prompt = `You are an analytics expert. Based on the following QR scan analytics JSON, provide concise insights and actionable suggestions to increase scans and engagement. Be specific and practical.

Analytics data (JSON):
${JSON.stringify(insightData, null, 2)}

Respond with:
1. **Key insights** (2–3 bullet points)
2. **Suggestions to increase scans** (3–5 actionable recommendations)
Keep the tone professional and brief. Use markdown for lists and bold where helpful.`;
    const res = await ollama.chat({
      model: "gpt-oss:20b",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.4,
    });
    console.log(res);
  } catch (error) {
    console.error("err:", error);
  }
};

export { handleRag, handleInsights };
