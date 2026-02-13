import rateLimit from "express-rate-limit";
import express from "express";
import askRoute from "./routes/ask.js";

const app = express();

/* ✅ Trust proxy (important for Render/Railway/Vercel) */
app.set("trust proxy", 1);

/* ✅ Rate limiter */
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP
  message: {
    error: "Too many requests. Please try again later."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/* ✅ Middleware order */
app.use(express.json());
app.use(limiter);

/* ✅ Health check route */
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

/* ✅ API routes */
app.use("/api", askRoute);

/* ✅ Start server */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
