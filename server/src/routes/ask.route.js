import { Router } from "express";
import { handleRag, handleInsights } from "../controller/ask.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.post("/ask", asyncHandler(handleRag));
router.post("/get-insights", asyncHandler(handleInsights));

export default router;
