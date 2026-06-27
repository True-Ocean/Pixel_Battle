import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';

const root = resolve(import.meta.dirname, '..');
const sourcePath = resolve(root, 'public/app-icon-source.png');

if (!existsSync(sourcePath)) {
  console.error('Missing public/app-icon-source.png — place the master icon there first.');
  process.exit(1);
}

const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };

/** Pixel-art friendly resize (nearest-neighbor).透過は白に合成。 */
function resizeIcon(size) {
  return sharp(sourcePath)
    .resize(size, size, { kernel: sharp.kernel.nearest })
    .flatten({ background: WHITE })
    .png();
}

const outputs = [
  { name: 'favicon.png', size: 32 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'pwa-192x192.png', size: 192 },
  { name: 'pwa-512x512.png', size: 512 },
];

for (const { name, size } of outputs) {
  await resizeIcon(size).toFile(resolve(root, 'public', name));
  console.log(`wrote public/${name} (${size}x${size})`);
}
