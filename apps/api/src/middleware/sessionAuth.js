import { verifyToken } from "../utils/token.js";

export function requireSession(req, res, next) {
  const header = req.headers.authorization;
  if (!header) {
    return res.status(401).json({ error: "missing token" });
  }

  const token = header.replace("Bearer ", "");

  try {
    const payload = verifyToken(token);
    req.sessionId = payload.sid;
    next();
  } catch {
    return res.status(401).json({ error: "token expired or invalid" });
  }
}
