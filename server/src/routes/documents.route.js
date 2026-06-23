import { Router } from "express";
import multer from "multer";
import { uploadFile } from "../controller/upload.controller.js";
import { getGoogleDocs, getGoogleDocsEmbedding, listGoogleDocsFiles, getMetaData } from "../controller/external.source.doc.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();
const upload = multer({ dest: "uploads/" });

router.post("/upload", upload.single("file"), asyncHandler(uploadFile));
router.get("/google-docs", asyncHandler(getGoogleDocs));
router.post("/embed-google-doc", asyncHandler(getGoogleDocsEmbedding));
router.get("/user-docs", asyncHandler(listGoogleDocsFiles));
router.get("/get-metadata", asyncHandler(getMetaData));

export default router;
