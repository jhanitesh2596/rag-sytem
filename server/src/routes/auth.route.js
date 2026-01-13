import { Router } from "express";
import { getGoogleRedirectUrl } from "../controller/google.auth.controller.js";

const router = Router();

router.get("/google-redirect", getGoogleRedirectUrl);

export default router;
