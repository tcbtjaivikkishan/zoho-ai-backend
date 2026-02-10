import "dotenv/config";
import express from "express";
import rateLimit from "express-rate-limit";
import cors from "cors";

import askRouter from "./routes/ask.js";
import { createSession } from "./routes/session.js";
import { getChats } from "./routes/chats.js";
import { requireSession } from "./middleware/sessionAuth.js";
import { sessionLimiter } from "./middleware/sessionRateLimit.js";

const app = express();

/* ✅ Trust proxy */
app.set("trust proxy", 1);

//cors 
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));
/* =========================
   🌐 IP-based rate limit
========================= */
const ipLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // higher limit per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many requests from this network. Please try again later."
  }
});

/* =========================
   Middleware order
========================= */
app.use(express.json());
app.use(ipLimiter);

/* =========================
   Health
========================= */
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

/* =========================
   API ROUTES
========================= */

/* Create anonymous session */
app.post("/api/session", createSession);

/* Ask question (JWT + session rate limit) */
app.post(
  "/api/ask",
  requireSession,
  sessionLimiter,
  askRouter
);

/* Fetch chats */
app.get(
  "/api/chats",
  requireSession,
  getChats
);

/* ========================= */

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

