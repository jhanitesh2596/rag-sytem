import { driveClient, docsClient } from "../config/google.auth.js";

export async function fetchGoogleDocText(docId) {
  const res = await docsClient.documents.get({
    documentId: docId,
  });

  const content = res.data.body.content;

  let fullText = "";

  for (const element of content) {
    if (element.paragraph) {
      for (const run of element.paragraph.elements) {
        if (run.textRun?.content) {
          fullText += run.textRun.content;
        }
      }
    }
  }

  return fullText.trim();
}

export async function listGoogleDocs() {
  const res = await driveClient.files.list({
    fields: "files(id, name, mimeType)",
    pageSize: 20,
  });

  return res.data.files;
}
