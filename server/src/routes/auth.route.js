import { Router } from "express";
import {
  getGoogleConnectionStatus,
  getGoogleRedirectUrl,
  handleGoogleCallback,
} from "../controller/google.auth.controller.js";

const router = Router();

router.get("/google-status", getGoogleConnectionStatus);
router.get("/google-redirect", getGoogleRedirectUrl);
router.get("/google/callback", handleGoogleCallback);

export default router;
