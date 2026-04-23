import { googleOAuth, OAUTH_SCOPES } from "../config/google.auth.js";
import { connection } from "../config/redisClient.js";

const getGoogleRedirectUrl = async (req, res) => {
  try {
    const url = googleOAuth.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: OAUTH_SCOPES,
      redirect_uri: "http://localhost:5001/api/auth/google/callback"
    });

    res.json({ url });
  } catch (error) {
    console.error(error);
  }
};

const GOOGLE_TOKEN_KEY = "google:token:20";

const getGoogleConnectionStatus = async (req, res) => {
  try {
    const tokens = await connection.hgetall(GOOGLE_TOKEN_KEY);
    const connected = Boolean(
      tokens &&
        Object.keys(tokens).length > 0 &&
        (tokens.access_token || tokens.refresh_token),
    );
    res.json({ connected });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      connected: false,
      message: "Could not read Google connection state.",
    });
  }
};

const handleGoogleCallback = async (req, res) => {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  try {
    const { code } = req.query;
    if (!code) {
      return res.redirect(`${frontendUrl}?google=error&message=no_code`);
    }
    const { tokens } = await googleOAuth.getToken(code);
    googleOAuth.setCredentials(tokens);
    await connection.hset(GOOGLE_TOKEN_KEY, tokens);
    return res.redirect(`${frontendUrl}?google=connected`);
  } catch (error) {
    console.error(error);
    return res.redirect(`${frontendUrl}?google=error`);
  }
};

export { getGoogleRedirectUrl, getGoogleConnectionStatus, handleGoogleCallback };
