import "dotenv/config";   // 👈 MUST be first

import express from "express";
import cors from "cors";
import chatRoutes from "./routes/chatRoutes.js";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/chat", chatRoutes);

app.listen(8000, () => {
  console.log("Server running on port 8000");
});