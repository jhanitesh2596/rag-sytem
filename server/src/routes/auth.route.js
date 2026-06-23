import { Router } from "express";
import {
  getGoogleConnectionStatus,
  getGoogleRedirectUrl,
  handleGoogleCallback,
} from "../controller/google.auth.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.get("/google-status", asyncHandler(getGoogleConnectionStatus));
router.get("/google-redirect", asyncHandler(getGoogleRedirectUrl));
router.get("/google/callback", asyncHandler(handleGoogleCallback));

export default router;
