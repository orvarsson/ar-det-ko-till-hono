// Generates the PWA / home-screen icons from the site's ferry mark.
//
// Two shapes are produced:
//   - "any": the rounded-square favicon, rasterised at install sizes.
//   - "maskable" / apple-touch: a full-bleed square (no rounded corners,
//     no transparency) so platform masks and iOS rounding don't clip the
//     ferry. The ferry is kept well within the maskable safe zone.
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

// The ferry mark: a side-on ferry (cabin + hull) over two short water lines.
// Drawn around x:13-51, y:25-54 then lifted to sit vertically centred in the
// tile, staying inside the maskable safe zone.
const ferry = `
  <g transform="translate(0 -6)">
  <g fill="${FG}">
    <rect x="21" y="25" width="22" height="12" rx="2"/>
    <path d="M13 37 H51 L46 47 Q45.2 48.2 43.8 48.2 H20.2 Q18.8 48.2 18 47 Z"/>
  </g>
  <g fill="${BG}">
    <rect x="24.5" y="28.5" width="4.5" height="5" rx="1"/>
    <rect x="29.75" y="28.5" width="4.5" height="5" rx="1"/>
    <rect x="35" y="28.5" width="4.5" height="5" rx="1"/>
  </g>
  <g fill="${FG}" opacity="0.5">
    <rect x="15" y="51.5" width="14" height="2.4" rx="1.2"/>
    <rect x="33" y="51.5" width="16" height="2.4" rx="1.2"/>
  </g>
  </g>`;

// Rounded-square mark (matches favicon.svg) for the "any" purpose.
const anySvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="12" fill="${BG}"/>${ferry}
</svg>`;

// Full-bleed square for maskable + apple-touch (no rounded corners).
const solidSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="${BG}"/>${ferry}
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
