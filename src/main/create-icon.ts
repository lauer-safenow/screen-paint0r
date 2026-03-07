import { nativeImage } from 'electron';

// Minimal PNG encoder for RGBA pixel data
function encodePNG(width: number, height: number, rgba: Buffer): Buffer {
  const { deflateSync } = require('node:zlib');

  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function crc32(buf: Buffer): number {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c = (c >>> 8) ^ crc32Table[(c ^ buf[i]) & 0xff];
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  const crc32Table: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc32Table[n] = c >>> 0;
  }

  function chunk(type: string, data: Buffer): Buffer {
    const typeBytes = Buffer.from(type, 'ascii');
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([typeBytes, data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
  }

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // IDAT: filter each row with filter type 0 (None)
  const rawData = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    rawData[y * (1 + width * 4)] = 0; // filter: None
    rgba.copy(rawData, y * (1 + width * 4) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const compressed = deflateSync(rawData);

  // IEND
  const iend = Buffer.alloc(0);

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', iend),
  ]);
}

function drawIcon(size: number): Buffer {
  const rgba = Buffer.alloc(size * size * 4, 0);

  const set = (x: number, y: number, r: number, g: number, b: number, a = 255) => {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const i = (y * size + x) * 4;
    // Alpha blend
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

  const disc = (cx: number, cy: number, rad: number, r: number, g: number, b: number, a = 255) => {
    for (let dy = -rad - 1; dy <= rad + 1; dy++)
      for (let dx = -rad - 1; dx <= rad + 1; dx++)
        if (dx * dx + dy * dy <= rad * rad)
          set(cx + dx, cy + dy, r, g, b, a);
  };

  const line = (x0: number, y0: number, x1: number, y1: number, w: number, r: number, g: number, b: number, a = 255) => {
    const dist = Math.hypot(x1 - x0, y1 - y0);
    const steps = Math.max(Math.ceil(dist * 3), 1);
    for (let t = 0; t <= steps; t++) {
      const f = t / steps;
      disc(x0 + (x1 - x0) * f, y0 + (y1 - y0) * f, w, r, g, b, a);
    }
  };

  const s = size;
  const scale = s / 32;

  // Pen body — diagonal from top-right to center
  line(22 * scale, 4 * scale, 12 * scale, 14 * scale, 2.5 * scale, 180, 180, 200);

  // Ferrule
  line(12 * scale, 14 * scale, 9 * scale, 17 * scale, 2 * scale, 140, 140, 160);

  // Pen tip
  line(9 * scale, 17 * scale, 5 * scale, 23 * scale, 1.5 * scale, 100, 100, 120);

  // Nib point
  disc(4 * scale, 24 * scale, 1.5 * scale, 60, 60, 80);

  // Red paint stroke from nib
  line(4 * scale, 24 * scale, 7 * scale, 26 * scale, 2 * scale, 230, 60, 60);
  line(7 * scale, 26 * scale, 12 * scale, 27 * scale, 1.5 * scale, 230, 60, 60);
  disc(13 * scale, 27 * scale, 1.5 * scale, 200, 40, 40);

  // Small paint dots
  disc(3 * scale, 27 * scale, 1 * scale, 255, 80, 80);
  disc(9 * scale, 29 * scale, 0.8 * scale, 255, 100, 80);

  return rgba;
}

export function createTrayIcon(): Electron.NativeImage {
  // Render at 2x for Retina, macOS tray expects ~18x18 logical
  const size = 36;
  const rgba = drawIcon(size);
  const png = encodePNG(size, size, rgba);

  const img = nativeImage.createFromBuffer(Buffer.from(png), {
    width: size,
    height: size,
    scaleFactor: 2.0,
  });
  return img;
}

export function createDockIcon(): Electron.NativeImage {
  const size = 128;
  const rgba = drawIcon(size);
  const png = encodePNG(size, size, rgba);

  return nativeImage.createFromBuffer(Buffer.from(png), { width: size, height: size });
}
