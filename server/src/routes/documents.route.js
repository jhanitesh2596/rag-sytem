import { Router } from "express";
import multer from "multer";
import { uploadFile } from "../controller/upload.controller.js";
import { getGoogleDocs, getGoogleDocsEmbedding, listGoogleDocsFiles } from "../controller/external.source.doc.js";

const router = Router();
const upload = multer({ dest: "uploads/" });

router.post("/upload", upload.single("file"), uploadFile);
router.get("/google-docs", getGoogleDocs)
router.post("/embed-google-doc", getGoogleDocsEmbedding);
router.get("/user-docs", listGoogleDocsFiles)

export default router;
