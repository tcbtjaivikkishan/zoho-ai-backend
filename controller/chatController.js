export const uploadPdf = async (req, res) => {
  try {
    const text = await processPdfService(req.file.path);

    // TEMP: verify output
    console.log(text.slice(0, 500));

    res.json({
      success: true,
      chars: text.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Upload failed" });
  }
};
