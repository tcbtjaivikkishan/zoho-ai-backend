import express from "express";
import multer from "multer";
import { uploadPdf } from "../controller/chatController.js";

const router = express.Router();

const upload = multer({
  dest: "pdf/uploads/",
});

router.post("/upload-pdf", upload.single("pdf"), uploadPdf);

export default router;
