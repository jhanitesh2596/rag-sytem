import { Router } from "express";
import { listenWebhook } from "../controller/external.source.doc.js";

const router = Router();

router.post("/google-webhook", listenWebhook);

export default router;
