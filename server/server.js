import express from "express";
import documentsRouter from "./src/routes/documents.route.js";
import askRouter from "./src/routes/ask.route.js";
import authRouter from "./src/routes/auth.route.js";
import webhookRoute from "./src/routes/webhook.route.js";
import cors from "cors";
import { errorHandler } from "./src/middlewares/error.middleware.js";
import logger from "./src/utils/logger.js";
import session from "express-session";

const app = express();
app.use(cors());

app.use(express.json());

app.use(
  session({
    name: "rag.sid",
    secret: "super-secret-key",
    resave: false, // ✅ critical
    saveUninitialized: false, // ✅ critical
    cookie: {
      httpOnly: false,
      secure: false, // true only on HTTPS
      sameSite: "lax", // ✅ REQUIRED for OAuth
      maxAge: 24 * 60 * 60 * 1000,
    },
  }),
);
app.use("/api/auth", authRouter);
app.use("/api/documents", documentsRouter);
app.use("/api/cloud", askRouter);
app.use("/api/webhook", webhookRoute);

/* 404 handler */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

app.use(errorHandler);

const PORT = 5001;
app
  .listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  })
  .on("error", (error) => {
    console.error("Server error:", error);
    process.exit(1);
  });

/* Server-level crash protection */
process.on("unhandledRejection", (err) => {
  logger.error("Unhandled Rejection", err);
  server.close(() => process.exit(1));
});

process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception", err);
  process.exit(1);
});
