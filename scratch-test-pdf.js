const fs = require('fs');
async function test() {
  try {
    const { PDFParse } = require('pdf-parse');
    const parser = new PDFParse({ data: Buffer.from("fake pdf data") });
    await parser.getText();
    console.log("Success");
  } catch (e) {
    console.error("Error", e.message);
  }
}
test();
