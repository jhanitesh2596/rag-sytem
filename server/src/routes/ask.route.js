import { Router } from "express";
import { handleRag, handleInsights } from "../controller/ask.controller.js";

const router = Router();

router.post("/ask", handleRag);
router.post("/get-insights", handleInsights)

export default router;
