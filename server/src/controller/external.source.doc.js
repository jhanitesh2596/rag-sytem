import "dotenv/config";
import { google } from "googleapis";
import { listGoogleDocs } from "../services/googleDocs.service.js";
import { docsClient, driveClient } from "../config/google.auth.js";
import mammoth from "mammoth";
import { chunkText } from "../services/chunk.service.js";
import { createEmbedding } from "../services/embedding.service.js";
import { saveChunk } from "../db/documentChunks.repo.js";

const getGoogleDocs = async (req, res) => {
  try {
    const docs = await listGoogleDocs();
    res.json({ docs });
  } catch (error) {
    console.error("err", error);
  }
};

const fetchDocById = async (file) => {
  console.log("fi", file);
  if (
    file.mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const res = await driveClient.files.get(
      { fileId: file.id, alt: "media" },
      { responseType: "arraybuffer" }
    );
    const result = await mammoth.extractRawText({
      buffer: res.data,
    });
    return result.value;
  }
  if (file.mimeType === "application/vnd.google-apps.document") {
    const doc = await docsClient.documents.get({
      documentId: file.id,
    });

    return {
      content: doc.data.body.content
        .map(
          (c) =>
            c.paragraph?.elements
              ?.map((e) => e.textRun?.content || "")
              .join("") || ""
        )
        .join("\n"),
      name: file?.name,
      docId: file?.id,
    };
  }

  // PDF
  if (file.mimeType === "application/pdf") {
    const data = await pdf(Buffer.from(res.data));
    return data.text;
  }

  return "";
};

const getGoogleDocsEmbedding = async (req, res) => {
  try {
    if (req.body.id) {
      const result = await fetchDocById(req.body);
      const chunks = chunkText(result.content);
      console.log("chunks", chunks);

      for (let i = 0; i < chunks.length; i++) {
        const embedding = await createEmbedding(chunks[i]);
        await saveChunk({
          workspaceId: 2,
          text: chunks[i],
          embedding,
          metadata: {
            docId: result?.docId,
            chunkIndex: i,
          },
        });
      }
      res.json({ result });
      return;
    }
    const allDocs = await listGoogleDocs();
    const docFiles = await allDocs?.map(async (li) => await fetchDocById(li));
    const result = await Promise.all(docFiles);
    res.json({ file: result });
  } catch (error) {
    console.error("err-gd", error);
  }
};

export { getGoogleDocs, getGoogleDocsEmbedding };
