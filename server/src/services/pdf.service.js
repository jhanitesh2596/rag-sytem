import fs from "fs";
import { PDFParse } from "pdf-parse";

export async function extractPdfText(filePath) {
  const buffer = fs.readFileSync(filePath);
  const data = await new PDFParse(new Uint8Array(buffer));
  const dataText = await data.getText();
  const text = dataText.pages?.map(li => li?.text).join("+")
  return text.replace(/-- \d+ of \d+ --/g, "").trim();
}
