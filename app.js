import express from "express";
import cors from "cors";
import chatRoutes from "./routes/chat.routes.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.use("/api", chatRoutes);

export default app;
