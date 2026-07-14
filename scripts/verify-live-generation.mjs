#!/usr/bin/env node
/** Verify the most recent live generation artifacts meet success criteria. */
import fs from "fs";
import path from "path";
import { STORAGE_PATH } from "./seed-utils.mjs";

const genId = process.argv[2];
const genRoot = path.join(STORAGE_PATH, "generations");

const dirs = genId
  ? [genId]
  : fs
      .readdirSync(genRoot)
      .filter((d) => fs.statSync(path.join(genRoot, d)).isDirectory())
      .sort(
        (a, b) =>
          fs.statSync(path.join(genRoot, b)).mtimeMs -
          fs.statSync(path.join(genRoot, a)).mtimeMs
      );

const id = dirs[0];
const dir = path.join(genRoot, id);
const pdf = path.join(dir, "main.pdf");
const bib = path.join(dir, "references.bib");
const sections = path.join(dir, "sections");

let words = 0;
let sectionCount = 0;
if (fs.existsSync(sections)) {
  for (const f of fs.readdirSync(sections)) {
    if (f.endsWith(".tex")) {
      sectionCount++;
      words += fs.readFileSync(path.join(sections, f), "utf8").split(/\s+/).length;
    }
  }
}

const pdfSize = fs.existsSync(pdf) ? fs.statSync(pdf).size : 0;
const bibText = fs.existsSync(bib) ? fs.readFileSync(bib, "utf8") : "";
const ok =
  pdfSize > 50000 &&
  words >= 2500 &&
  sectionCount >= 5 &&
  bibText.length > 200 &&
  !bibText.includes("placeholder2024");

console.log(`Generation: ${id}`);
console.log(`PDF: ${pdfSize} bytes`);
console.log(`Words (sections): ${words}`);
console.log(`Section files: ${sectionCount}`);
console.log(`references.bib: ${bibText.length} chars`);
console.log(ok ? "PASS" : "FAIL");
process.exit(ok ? 0 : 1);
