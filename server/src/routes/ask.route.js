import { Router } from "express";
import { handleRag } from "../controller/ask.controller.js";

const router = Router();

router.post("/ask", handleRag);

export default router;
