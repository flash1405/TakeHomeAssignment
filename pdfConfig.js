const { PDFDocument, StandardFonts } = require("pdf-lib");
const fs = require("fs");

async function createPDF(userId, userName, userEmail) {
  const filePath = `./pdf/${userId}.pdf`;
  fs.readFile(filePath, (err, file) => {
    if (err) {
      console.log("File does not exist, creating new file");
    } else {
      console.log("File already exists");
      return;
    }
  });
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const textSize = 17;
  const text = `Hello ${userName}, your user ID is ${userId} and your email is ${userEmail}`;

  page.drawText(text, {
    x: 35,
    y: page.getHeight() / 2 + textSize / 2,
    size: textSize,
    font,
  });

  const pdfBytes = await pdfDoc.save();
  fs.writeFile(filePath, pdfBytes, (err) => {
    if (err) {
      throw err;
    }
  });
}
module.exports = { createPDF: createPDF };
