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

/* CORS */
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

/* =========================
   🌐 IP-based rate limit (DISABLED FOR TESTING)
========================= */

// const ipLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   max: 100,
//   standardHeaders: true,
//   legacyHeaders: false,
//   message: {
//     error: "Too many requests from this network. Please try again later."
//   }
// });

/* =========================
   Middleware order
========================= */

app.use(express.json());

// app.use(ipLimiter); // ❌ Disabled for testing

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

/* Ask question (JWT + session rate limit DISABLED) */
app.use(
  "/api",
   requireSession,      // ❌ Disable if you want to skip JWT check
  // sessionLimiter,      // ❌ Disabled for testing
  askRouter
);

/* Fetch chats (auth disabled optional) */
app.get(
  "/api/chats",
  // requireSession,      // ❌ Disable if needed
  getChats
);

/* ========================= */

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
