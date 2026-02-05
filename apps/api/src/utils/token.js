import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

export function createSessionToken(sessionId) {
  return jwt.sign(
    { sid: sessionId },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}
