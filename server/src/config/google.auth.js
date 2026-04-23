import { google } from "googleapis";
import path from "path";

const keyPath = path.join(process.cwd(), process.env.GOOGLE__SECRET_JSON);

export const auth = new google.auth.GoogleAuth({
  keyFile: keyPath,
  scopes: [
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/documents.readonly",
  ],
});

export const googleOAuth = new google.auth.OAuth2(
  process.env.GOOGLE_DOCS_CLIEND_ID,
  process.env.GOOGLE_DOCS_CLIENT_SECRET,
  "http://localhost:5001/api/auth/google/callback"
);

export const OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/documents",
];

export const driveClient = google.drive({
  version: "v3",
  auth,
});

export const docsClient = google.docs({
  version: "v1",
  auth,
});
