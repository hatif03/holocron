#!/usr/bin/env node
/** Regenerate chart SVG assets into scripts/seed-assets/ */
import path from "path";
import { fileURLToPath } from "url";
import { writeReviewCurveSvg, writeRagMetricsSvg } from "./seed-utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assets = path.join(__dirname, "seed-assets");

writeReviewCurveSvg(path.join(assets, "review_quality_curve.svg"));
writeRagMetricsSvg(path.join(assets, "rag_retrieval_curve.svg"));
console.log("Generated review_quality_curve.svg and rag_retrieval_curve.svg");
