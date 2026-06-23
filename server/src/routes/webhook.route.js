import { Router } from "express";
import { listenWebhook } from "../controller/external.source.doc.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.post("/google-webhook", asyncHandler(listenWebhook));

export default router;
