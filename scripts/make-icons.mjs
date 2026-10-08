/*
 * Makes the logo and the browser-tab icons from the Prism picture (public/prism-spectrum-clear.png):
 * the picture is put on black (as in the original artwork), cropped square around the prism and its
 * rays, and given rounded corners.
 *   public/logo-prism.png     256 px, the logo in the top bar
 *   src/app/icon.png          512 px, the tab icon
 *   src/app/favicon.ico       16, 32 and 48 px
 *   src/app/apple-icon.png    180 px
 * Run after changing the picture:  node scripts/make-icons.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const source = readFileSync("public/prism-spectrum-clear.png").toString("base64");
// Square crop of the 1254 px picture: the beam stub, the prism and the six rays.
const CROP = { x: 330, y: 140, size: 920 };

const browser = await chromium.launch({ channel: "msedge" });
const page = await browser.newPage();
await page.setContent("<html><body></body></html>");

async function render(size) {
  const url = await page.evaluate(
    async ({ b64, size, crop }) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const c = document.createElement("canvas");
      c.width = size;
      c.height = size;
      const ctx = c.getContext("2d");
      const r = size * 0.22;
      ctx.beginPath();
      ctx.roundRect(0, 0, size, size, r);
      ctx.clip();
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, size, size);
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, crop.x, crop.y, crop.size, crop.size, 0, 0, size, size);
      return c.toDataURL("image/png");
    },
    { b64: source, size, crop: CROP },
  );
  return Buffer.from(url.split(",")[1], "base64");
}

writeFileSync("public/logo-prism.png", await render(256));
writeFileSync("src/app/icon.png", await render(512));
writeFileSync("src/app/apple-icon.png", await render(180));

const images = [];
for (const s of [16, 32, 48]) images.push({ size: s, data: await render(s) });
const header = Buffer.alloc(6);
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
await browser.close();
console.log("logo-prism.png, icon.png, apple-icon.png and favicon.ico written");
