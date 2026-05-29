// Generates the PWA / home-screen icons from the site's "?" mark.
//
// Two shapes are produced:
//   - "any": the rounded-square favicon, rasterised at install sizes.
//   - "maskable" / apple-touch: a full-bleed square (no rounded corners,
//     no transparency) so platform masks and iOS rounding don't clip the
//     glyph. The "?" is kept well within the maskable safe zone.
//
// The generated PNGs are committed, so this only needs running when the mark
// changes. Requires sharp (not a project dependency — install ad-hoc first):
//   npm i -D sharp && node scripts/generate-icons.mjs
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const publicDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public");

const BG = "#1d3557";
const FG = "#f1faee";

// Rounded-square mark (matches favicon.svg) for the "any" purpose.
const anySvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="12" fill="${BG}"/>
  <text x="50%" y="58%" text-anchor="middle" dominant-baseline="middle"
    font-family="Georgia, serif" font-weight="700" font-size="38" fill="${FG}">?</text>
</svg>`;

// Full-bleed square for maskable + apple-touch. The glyph sits in the centre,
// comfortably inside the ~80% maskable safe zone.
const solidSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="${BG}"/>
  <text x="50%" y="58%" text-anchor="middle" dominant-baseline="middle"
    font-family="Georgia, serif" font-weight="700" font-size="32" fill="${FG}">?</text>
</svg>`;

const targets = [
  { svg: anySvg, size: 192, file: "icon-192.png" },
  { svg: anySvg, size: 512, file: "icon-512.png" },
  { svg: solidSvg, size: 512, file: "icon-maskable-512.png" },
  { svg: solidSvg, size: 180, file: "apple-touch-icon.png" },
];

for (const { svg, size, file } of targets) {
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(join(publicDir, file));
  console.log(`wrote public/${file} (${size}x${size})`);
}
