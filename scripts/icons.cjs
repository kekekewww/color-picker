const fs = require('node:fs');
const path = require('node:path');
const { png } = require('./binary.cjs');
const directory = path.join(__dirname, '..', 'icons');
fs.mkdirSync(directory, { recursive: true });
const paints = [[54,93,204], [169,184,239], [242,201,76], [255,132,150]];
function rounded(x, y, left, top, width, radius) {
  const dx = Math.max(left + radius - x, 0, x - (left + width - radius));
  const dy = Math.max(top + radius - y, 0, y - (top + width - radius));
  return x >= left && x <= left + width && y >= top && y <= top + width && dx * dx + dy * dy <= radius * radius;
}
for (const size of [16,48,128]) {
  const pixels = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const total = [0,0,0,0];
    for (let sy = 0; sy < 4; sy++) for (let sx = 0; sx < 4; sx++) {
      // The store icon has a 96px square artwork area and 16px transparent padding.
      const padding = size === 128 ? 16 : 0;
      const artwork = size - padding * 2;
      const px = (x + (sx + .5) / 4 - padding) / artwork * 128;
      const py = (y + (sy + .5) / 4 - padding) / artwork * 128;
      if (!rounded(px, py, 0, 0, 128, 27)) continue;
      let rgb = [30,49,81];
      for (let i = 0; i < 4; i++) if (rounded(px, py, 21 + i % 2 * 47, 21 + Math.floor(i / 2) * 47, 39, 8)) rgb = paints[i];
      for (let c = 0; c < 3; c++) total[c] += rgb[c];
      total[3] += 255;
    }
    const offset = (y * size + x) * 4;
    const samples = total[3] / 255;
    for (let c = 0; c < 3; c++) pixels[offset + c] = samples ? Math.round(total[c] / samples) : 0;
    pixels[offset + 3] = Math.round(total[3] / 16);
  }
  fs.writeFileSync(path.join(directory, `icon${size}.png`), png(size, pixels));
}
console.log('Generated 16, 48 and 128px extension icons.');
