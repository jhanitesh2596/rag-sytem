import { ingestDocument } from "../services/ingestion.service.js";
import { v4 as uuid } from "uuid";
const uploadFile = (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const documentId = uuid();
    ingestDocument(req.file.path, documentId).catch((e) => console.error("eee",e));
    res.json({
      documentId,
      status: "processing",
    });
  } catch (err) {
    res.status(500).json({ error: "Upload failed" });
  }
};

export { uploadFile };
