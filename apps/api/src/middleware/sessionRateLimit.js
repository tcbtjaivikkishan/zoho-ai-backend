import rateLimit from "express-rate-limit";
import { ipKeyGenerator } from "express-rate-limit";

/**
 * Session-based rate limiter
 * Uses sessionId if available, otherwise safe IP fallback
 */
export const sessionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per session
  standardHeaders: true,
  legacyHeaders: false,

  keyGenerator: (req, res) => {
    // Prefer session-based limiting
    if (req.sessionId) {
      return `session:${req.sessionId}`;
    }

    // Safe IPv4/IPv6 fallback
    return ipKeyGenerator(req, res);
  },

  handler: (req, res) => {
    res.status(429).json({
      error: "You are sending too many questions. Please wait a few minutes."
    });
  }
});
