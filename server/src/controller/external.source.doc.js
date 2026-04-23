import "dotenv/config";
import { v4 as uuid } from "uuid";
import { listGoogleDocs } from "../services/googleDocs.service.js";
import { docsClient, driveClient, googleOAuth } from "../config/google.auth.js";
import mammoth from "mammoth";
import { chunkText } from "../services/chunk.service.js";
import { createEmbedding } from "../services/embedding.service.js";
import { saveChunk } from "../db/documentChunks.repo.js";
import { getOauthInstance } from "../services/googleoauth.service.js";
import { google } from "googleapis";
import { connection } from "../config/redisClient.js";

/** Service account clients, or user OAuth when `userAuth` is set */
const getDriveDocsClients = (userAuth) => {
  if (userAuth) {
    return {
      drive: google.drive({ version: "v3", auth: userAuth }),
      docs: google.docs({ version: "v1", auth: userAuth }),
    };
  }
  return { drive: driveClient, docs: docsClient };
};

const getGoogleDocs = async (req, res) => {
  try {
    const docs = await listGoogleDocs();
    res.json({ docs });
  } catch (error) {
    console.error("err", error);
  }
};

const fetchDocById = async (file, isUpdate = false, userAuth = null) => {
  const { drive, docs } = getDriveDocsClients(userAuth);
  if (isUpdate) {
    const res = await drive.files.get(
      { fileId: file, alt: "media" },
      { responseType: "arraybuffer" },
    );
    const result = await mammoth.extractRawText({
      buffer: res.data,
    });
    return result.value;
  }
  if (
    file.mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const res = await drive.files.get(
      { fileId: file.id, alt: "media" },
      { responseType: "arraybuffer" },
    );
    const result = await mammoth.extractRawText({
      buffer: res.data,
    });
    return result.value;
  }
  if (file.mimeType === "application/vnd.google-apps.document") {
    const doc = await docs.documents.get({
      documentId: file.id,
    });

    return {
      content: doc.data.body.content
        .map(
          (c) =>
            c.paragraph?.elements
              ?.map((e) => e.textRun?.content || "")
              .join("") || "",
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

const registerWebHookForDoc = async (doc, userAuth = null) => {
  try {
    const { drive } = getDriveDocsClients(userAuth);
    await drive.files.watch({
      fileId: doc?.docId,
      requestBody: {
        id: uuid(),
        type: "web_hook",
        address:
          "https://ab0ad659a5c3.ngrok-free.app/api/webhook/google-webhook",
      },
    });
  } catch (error) {}
};

const getGoogleDocsEmbedding = async (req, res) => {
  try {
    if (req.body.id) {
      const workspaceId = Number(req.body.workspaceId);
      if (!Number.isFinite(workspaceId) || workspaceId < 1) {
        return res.status(400).json({
          message: "workspaceId is required and must be a positive integer.",
        });
      }
      const tokens = await connection.hgetall("google:token:20");
      if (!tokens || !Object.keys(tokens).length) {
        return res.status(401).json({
          message: "Not signed in with Google. Complete OAuth first.",
        });
      }
      const userAuth = getOauthInstance(tokens);
      const result = await fetchDocById(req.body, false, userAuth);
      const text =
        typeof result === "string" ? result : result?.content ?? "";
      const docIdForMeta =
        typeof result === "object" && result?.docId != null
          ? result.docId
          : req.body.id;
      const chunks = chunkText(text);

      console.log("chunks", chunks);

      for (let i = 0; i < chunks.length; i++) {
        const embedding = await createEmbedding(chunks[i]);
        await saveChunk({
          workspaceId: workspaceId,
          text: chunks[i],
          embedding,
          metadata: {
            docId: docIdForMeta,
            chunkIndex: i,
          },
        });
      }
      await registerWebHookForDoc(
        typeof result === "object" && result?.docId
          ? result
          : { docId: docIdForMeta },
        userAuth,
      );
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

const handleUpdate = async (file) => {
  try {
    console.log("inup", file);
    const result = await fetchDocById(file, true);
    const chunks = chunkText(result.content);

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
  } catch (error) {
    console.error("errrr", error);
  }
};

const listenWebhook = async (req, res) => {
  res.status(200).send("OK"); // must respond immediately
  console.log("req55", req.headers);
  const resourceId = req.headers["x-goog-resource-id"];
  const fileId = req.headers["x-goog-resource-uri"]?.split("files/")[1];
  await handleUpdate(fileId, true);
  if (!fileId) return;
};

const listGoogleDocsFiles = async (req, res) => {
  try {
    const tokens = await connection.hgetall(`google:token:20`);
    console.log("req.session", tokens);
    const auth = getOauthInstance(tokens);
    const drive = google.drive({ version: "v3", auth });

    const listRes = await drive.files.list({
      q: `
      mimeType='application/vnd.google-apps.document'
      or mimeType='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    `,
      fields: "files(id, name, mimeType, modifiedTime)",
      pageSize: 100,
    });
    console.log("list, res", listRes);
    res.json({ files: listRes.data.files });
  } catch (error) {
    console.error("err", error);
  }
};

export {
  getGoogleDocs,
  getGoogleDocsEmbedding,
  listenWebhook,
  listGoogleDocsFiles,
};
