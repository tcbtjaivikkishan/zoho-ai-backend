from fastapi import FastAPI, UploadFile, File, HTTPException
from paddleocr import PaddleOCR
from pdf2image import convert_from_bytes
import tempfile
import os

app = FastAPI()

# ===============================
# Initialize OCR ONCE (SAFE MODE)
# ===============================
ocr = PaddleOCR(
    lang="hi",
    det=True,
    rec=True,
    cls=False,             # 🔴 MUST be False
    use_angle_cls=False,   # 🔴 MUST be False
    show_log=False
)

@app.post("/ocr")
async def ocr_pdf(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF supported")

    pdf_bytes = await file.read()

    with tempfile.TemporaryDirectory() as tmpdir:
        images = convert_from_bytes(pdf_bytes, dpi=300)

        pages = []

        for i, img in enumerate(images):
            img_path = os.path.join(tmpdir, f"page_{i}.png")
            img.save(img_path, "PNG")

            # SAFE inference path (no PIR)
            result = ocr.ocr(img_path)

            page_text = []
            for line in result:
                page_text.append({
                    "text": line[1][0],
                    "confidence": float(line[1][1])
                })

            pages.append({
                "page": i + 1,
                "lines": page_text
            })

    return {
        "filename": file.filename,
        "pages": pages
    }
# To run the app, use the command:
# uvicorn apps.ocr.app:app --host