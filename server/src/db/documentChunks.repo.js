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

