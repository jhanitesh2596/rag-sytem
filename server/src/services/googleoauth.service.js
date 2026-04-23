import { google } from "googleapis";

const getOauthInstance = (tokens) => {
  if (!tokens || !Object.keys(tokens).length) {
    throw new Error("User not authenticated with Google");
  }

  const googleOauth = new google.auth.OAuth2(
    process.env.GOOGLE_DOCS_CLIEND_ID,
    process.env.GOOGLE_DOCS_CLIENT_SECRET,
    "http://localhost:5001/api/auth/google/callback",
  );
  googleOauth.setCredentials(tokens);
  return googleOauth;
};

export { getOauthInstance };
