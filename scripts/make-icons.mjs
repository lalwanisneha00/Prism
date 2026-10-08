/*
 * Makes the browser-tab icons from src/app/icon.svg (the Prism mark):
 *   src/app/favicon.ico      16, 32 and 48 px (PNG inside ICO)
 *   src/app/apple-icon.png   180 px (home-screen icon)
 * Run after changing icon.svg:  node scripts/make-icons.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const svg = readFileSync("src/app/icon.svg", "utf8");
const browser = await chromium.launch({ channel: "msedge" });
const page = await browser.newPage({ deviceScaleFactor: 1 });

async function png(size) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<html><body style="margin:0;background:transparent"><div style="width:${size}px;height:${size}px">${svg.replace(
      "<svg ",
      `<svg width="${size}" height="${size}" `,
    )}</div></body></html>`,
  );
  return page.screenshot({
    type: "png",
    omitBackground: true,
    clip: { x: 0, y: 0, width: size, height: size },
  });
}

const sizes = [16, 32, 48];
const images = [];
for (const s of sizes) images.push({ size: s, data: await png(s) });

// ICO: header, one directory entry per image, then the PNG files.
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(images.length, 4);
let offset = 6 + images.length * 16;
const entries = images.map((img) => {
  const e = Buffer.alloc(16);
  e.writeUInt8(img.size, 0);
  e.writeUInt8(img.size, 1);
  e.writeUInt16LE(1, 4);
  e.writeUInt16LE(32, 6);
  e.writeUInt32LE(img.data.length, 8);
  e.writeUInt32LE(offset, 12);
  offset += img.data.length;
  return e;
});
writeFileSync(
  "src/app/favicon.ico",
  Buffer.concat([header, ...entries, ...images.map((i) => i.data)]),
);
writeFileSync("src/app/apple-icon.png", await png(180));
await browser.close();
console.log("favicon.ico and apple-icon.png written");
