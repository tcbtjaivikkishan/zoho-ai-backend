import "dotenv/config";
import express from "express";
import dotenv from "dotenv";
import { chat } from "./routes/chat.js";

dotenv.config();

const app = express();
app.use(express.json());

app.post("/ask", chat);

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`🚀 API running on http://localhost:${PORT}`);
});
