import express from "express";
import { chatController } from "../controller/chat.controller.js";

const router = express.Router();

router.post("/chat", chatController);

export default router;
