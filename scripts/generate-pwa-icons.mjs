import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';

const root = resolve(import.meta.dirname, '..');
const svg = readFileSync(resolve(root, 'public/favicon.svg'));
const background = { r: 223, g: 227, b: 236, alpha: 1 };

const sizes = [
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'pwa-192x192.png', size: 192 },
  { name: 'pwa-512x512.png', size: 512 },
];

for (const { name, size } of sizes) {
  const padding = Math.round(size * 0.14);
  const inner = size - padding * 2;

  await sharp(svg)
    .resize(inner, inner, { fit: 'contain', background })
    .extend({
      top: padding,
      bottom: padding,
      left: padding,
      right: padding,
      background,
    })
    .png()
    .toFile(resolve(root, 'public', name));

  console.log(`wrote public/${name}`);
}
