import fs from "fs";
import { extractPdfText } from "./pdf.service.js";
import { chunkText } from "./chunk.service.js";
import { createEmbedding } from "./embedding.service.js";
import { saveChunk } from "../db/documentChunks.repo.js";

export async function ingestDocument(filePath, documentId) {
  const text = await extractPdfText(filePath);
  const chunks = chunkText(text);

  for (let i = 0; i < chunks.length; i++) {
    const embedding = await createEmbedding(chunks[i]);
    await saveChunk({
      workspaceId: 1,
      text: chunks[i],
      embedding,
      metadata: {
        docId: documentId,
        chunkIndex: i,
      },
    });
  }

  fs.unlinkSync(filePath); // cleanup
}
