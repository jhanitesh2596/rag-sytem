import { googleOAuth, OAUTH_SCOPES } from "../config/google.auth.js";

const getGoogleRedirectUrl = async (req, res) => {
  try {
    const url = googleOAuth.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: OAUTH_SCOPES,
      redirect_uri: "http://localhost:50001/google/callback"
    });

    res.json({ url });
  } catch (error) {
    console.error(error);
  }
};

export { getGoogleRedirectUrl };
