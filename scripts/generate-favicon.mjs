#!/usr/bin/env node
/**
 * One-off script: resize public/logo.png to favicon + apple-touch-icon.
 * Usage: node scripts/generate-favicon.mjs
 */
import sharp from "sharp";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = resolve(__dirname, "../public/logo.png");
const outDir = resolve(__dirname, "../public");

await Promise.all([
  sharp(src)
    .resize(32, 32, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toFile(resolve(outDir, "favicon-32.png")),
  sharp(src)
    .resize(180, 180, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toFile(resolve(outDir, "apple-touch-icon.png")),
]);

console.log("✓ Generated favicon-32.png (32×32)");
console.log("✓ Generated apple-touch-icon.png (180×180)");
