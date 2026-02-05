import "dotenv/config";
import express from "express";
import rateLimit from "express-rate-limit";

import askRouter from "./routes/ask.js";
import { createSession } from "./routes/session.js";
import { getChats } from "./routes/chats.js";
import { requireSession } from "./middleware/sessionAuth.js";

const app = express();

/* ✅ Trust proxy (Render / Railway / Vercel) */
app.set("trust proxy", 1);

/* ✅ Global rate limiter (IP-based for now) */
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 requests per IP
  message: {
    error: "Too many requests. Please try again later."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/* ✅ Middleware order */
app.use(express.json());
app.use(limiter);

/* ✅ Health check */
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

/* =========================
   API ROUTES
========================= */

/* 1️⃣ Create anonymous session */
app.post("/api/session", createSession);

/* 2️⃣ Ask question (JWT protected inside router) */
app.use("/api", askRouter);

/* 3️⃣ Fetch chat history (JWT protected) */
app.get("/api/chats", requireSession, getChats);

/* ========================= */

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
