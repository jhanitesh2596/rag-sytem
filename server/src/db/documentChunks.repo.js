import { v4 as uuid } from "uuid";
import index from "../config/pinecone.js";

export async function saveChunk({ workspaceId, text, embedding, metadata }) {
  try {
    await index.upsert([
      {
        id: uuid(),
        values: embedding,
        metadata: {
          text,
          workspaceId,
          ...metadata,
        },
      },
    ]);
  } catch (error) {
    console.error(error);
  }
}

export async function alreadyExists(docid) {
  try {
    const res = await index.namespace(process.env.PINECONE_DB).query({
      vector: new Array(768).fill(0), // dimension must match your index
      topK: 1,
      includeMetadata: true,
      filter: {
        docId: { $eq: docid },
      },
    });
  } catch (error) {
    console.error(error);
  }
}
