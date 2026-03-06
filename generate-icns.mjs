// Generate .icns file from our custom icon drawing
// Uses the same drawIcon function from create-icon.ts but standalone for build tooling

import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

function encodePNG(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const crc32Table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc32Table[n] = c >>> 0;
  }

  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) c = (c >>> 8) ^ crc32Table[(c ^ buf[i]) & 0xff];
    return (c ^ 0xffffffff) >>> 0;
  }

  function chunk(type, data) {
    const typeBytes = Buffer.from(type, 'ascii');
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([typeBytes, data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const rawData = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    rawData[y * (1 + width * 4)] = 0;
    rgba.copy(rawData, y * (1 + width * 4) + 1, y * width * 4, (y + 1) * width * 4);
  }

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(rawData)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function drawIcon(size) {
  const rgba = Buffer.alloc(size * size * 4, 0);

  const set = (x, y, r, g, b, a = 255) => {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const i = (y * size + x) * 4;
    const srcA = a / 255;
    const dstA = rgba[i + 3] / 255;
    const outA = srcA + dstA * (1 - srcA);
    if (outA > 0) {
      rgba[i] = Math.round((r * srcA + rgba[i] * dstA * (1 - srcA)) / outA);
      rgba[i + 1] = Math.round((g * srcA + rgba[i + 1] * dstA * (1 - srcA)) / outA);
      rgba[i + 2] = Math.round((b * srcA + rgba[i + 2] * dstA * (1 - srcA)) / outA);
      rgba[i + 3] = Math.round(outA * 255);
    }
  };

  const disc = (cx, cy, rad, r, g, b, a = 255) => {
    for (let dy = -rad - 1; dy <= rad + 1; dy++)
      for (let dx = -rad - 1; dx <= rad + 1; dx++)
        if (dx * dx + dy * dy <= rad * rad)
          set(cx + dx, cy + dy, r, g, b, a);
  };

  const line = (x0, y0, x1, y1, w, r, g, b, a = 255) => {
    const dist = Math.hypot(x1 - x0, y1 - y0);
    const steps = Math.max(Math.ceil(dist * 3), 1);
    for (let t = 0; t <= steps; t++) {
      const f = t / steps;
      disc(x0 + (x1 - x0) * f, y0 + (y1 - y0) * f, w, r, g, b, a);
    }
  };

  const s = size;
  const scale = s / 32;

  line(22 * scale, 4 * scale, 12 * scale, 14 * scale, 2.5 * scale, 180, 180, 200);
  line(12 * scale, 14 * scale, 9 * scale, 17 * scale, 2 * scale, 140, 140, 160);
  line(9 * scale, 17 * scale, 5 * scale, 23 * scale, 1.5 * scale, 100, 100, 120);
  disc(4 * scale, 24 * scale, 1.5 * scale, 60, 60, 80);
  line(4 * scale, 24 * scale, 7 * scale, 26 * scale, 2 * scale, 230, 60, 60);
  line(7 * scale, 26 * scale, 12 * scale, 27 * scale, 1.5 * scale, 230, 60, 60);
  disc(13 * scale, 27 * scale, 1.5 * scale, 200, 40, 40);
  disc(3 * scale, 27 * scale, 1 * scale, 255, 80, 80);
  disc(9 * scale, 29 * scale, 0.8 * scale, 255, 100, 80);

  return rgba;
}

// Generate PNGs at all required sizes for .iconset
const iconsetDir = join(tmpdir(), 'ScreenPaint0r.iconset');
execSync(`mkdir -p "${iconsetDir}"`);

const sizes = [
  { name: 'icon_16x16.png', size: 16 },
  { name: 'icon_16x16@2x.png', size: 32 },
  { name: 'icon_32x32.png', size: 32 },
  { name: 'icon_32x32@2x.png', size: 64 },
  { name: 'icon_128x128.png', size: 128 },
  { name: 'icon_128x128@2x.png', size: 256 },
  { name: 'icon_256x256.png', size: 256 },
  { name: 'icon_256x256@2x.png', size: 512 },
  { name: 'icon_512x512.png', size: 512 },
  { name: 'icon_512x512@2x.png', size: 1024 },
];

for (const { name, size } of sizes) {
  const rgba = drawIcon(size);
  const png = encodePNG(size, size, rgba);
  writeFileSync(join(iconsetDir, name), png);
}

// Use macOS iconutil to create .icns
const outPath = join(process.cwd(), 'assets', 'icon.icns');
execSync(`mkdir -p assets`);
execSync(`iconutil -c icns "${iconsetDir}" -o "${outPath}"`);
console.log(`Generated ${outPath}`);
