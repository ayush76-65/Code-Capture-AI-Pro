/**
 * Icon generation script
 * Run with: node scripts/generate-icons.mjs
 *
 * Generates 16x16, 48x48, and 128x128 PNG icons for the Chrome extension.
 * Uses a simple SVG-to-PNG approach with canvas.
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';

// Since we can't use canvas in Node without dependencies,
// we'll create simple but valid PNG files using raw bytes.

function createPNG(size) {
  // Create a minimal valid PNG with a green code bracket icon on dark background
  // Using a simple approach: create raw pixel data and encode as PNG

  const pixels = new Uint8Array(size * size * 4);

  // Background: #0d1117
  for (let i = 0; i < size * size; i++) {
    pixels[i * 4] = 13;     // R
    pixels[i * 4 + 1] = 17; // G
    pixels[i * 4 + 2] = 23; // B
    pixels[i * 4 + 3] = 255; // A
  }

  // Draw a rounded rectangle background with gradient feel
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size * 0.42;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - centerX;
      const dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < radius) {
        const idx = (y * size + x) * 4;
        // Green gradient: #238636 to #2ea043
        const t = dist / radius;
        pixels[idx] = Math.round(35 + t * 11);     // R
        pixels[idx + 1] = Math.round(134 + t * 26); // G
        pixels[idx + 2] = Math.round(54 + t * 13);  // B
        pixels[idx + 3] = 255;
      }
    }
  }

  // Draw code brackets < > and / using simple line drawing
  const scale = size / 128;
  const lineWidth = Math.max(2, Math.round(8 * scale));

  // Left bracket <
  drawLine(pixels, size, Math.round(48 * scale), Math.round(35 * scale), Math.round(30 * scale), Math.round(64 * scale), lineWidth, [255, 255, 255]);
  drawLine(pixels, size, Math.round(30 * scale), Math.round(64 * scale), Math.round(48 * scale), Math.round(93 * scale), lineWidth, [255, 255, 255]);

  // Right bracket >
  drawLine(pixels, size, Math.round(80 * scale), Math.round(35 * scale), Math.round(98 * scale), Math.round(64 * scale), lineWidth, [255, 255, 255]);
  drawLine(pixels, size, Math.round(98 * scale), Math.round(64 * scale), Math.round(80 * scale), Math.round(93 * scale), lineWidth, [255, 255, 255]);

  // Slash /
  drawLine(pixels, size, Math.round(72 * scale), Math.round(30 * scale), Math.round(56 * scale), Math.round(98 * scale), Math.round(lineWidth * 0.75), [255, 255, 255]);

  return encodePNG(pixels, size, size);
}

function drawLine(pixels, size, x0, y0, x1, y1, width, color) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));

  for (let i = 0; i <= steps; i++) {
    const t = steps === 0 ? 0 : i / steps;
    const cx = Math.round(x0 + dx * t);
    const cy = Math.round(y0 + dy * t);

    for (let wy = -width; wy <= width; wy++) {
      for (let wx = -width; wx <= width; wx++) {
        if (wx * wx + wy * wy <= width * width) {
          const px = cx + wx;
          const py = cy + wy;
          if (px >= 0 && px < size && py >= 0 && py < size) {
            const idx = (py * size + px) * 4;
            pixels[idx] = color[0];
            pixels[idx + 1] = color[1];
            pixels[idx + 2] = color[2];
            pixels[idx + 3] = 255;
          }
        }
      }
    }
  }
}

// Minimal PNG encoder
function encodePNG(pixels, width, height) {
  // PNG signature
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];

  // IHDR chunk
  const ihdr = createChunk('IHDR', [
    ...uint32(width),
    ...uint32(height),
    8, // bit depth
    6, // color type (RGBA)
    0, // compression
    0, // filter
    0, // interlace
  ]);

  // IDAT chunk - raw pixel data with zlib
  const rawData = [];
  for (let y = 0; y < height; y++) {
    rawData.push(0); // filter byte (none)
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      rawData.push(pixels[idx], pixels[idx + 1], pixels[idx + 2], pixels[idx + 3]);
    }
  }

  // Simple deflate (store blocks, no compression for simplicity)
  const deflated = deflateStore(new Uint8Array(rawData));
  const idat = createChunk('IDAT', deflated);

  // IEND chunk
  const iend = createChunk('IEND', []);

  return Buffer.from([...signature, ...ihdr, ...idat, ...iend]);
}

function createChunk(type, data) {
  const typeBytes = type.split('').map((c) => c.charCodeAt(0));
  const length = uint32(data.length);
  const combined = [...typeBytes, ...data];
  const crc = crc32(combined);
  return [...length, ...combined, ...uint32(crc)];
}

function uint32(value) {
  return [(value >> 24) & 0xff, (value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
}

function deflateStore(data) {
  // Zlib header
  const result = [0x78, 0x01];

  const maxBlock = 65535;
  let offset = 0;

  while (offset < data.length) {
    const remaining = data.length - offset;
    const blockSize = Math.min(remaining, maxBlock);
    const isLast = offset + blockSize >= data.length;

    result.push(isLast ? 1 : 0);
    result.push(blockSize & 0xff, (blockSize >> 8) & 0xff);
    result.push(~blockSize & 0xff, (~blockSize >> 8) & 0xff);

    for (let i = 0; i < blockSize; i++) {
      result.push(data[offset + i]);
    }

    offset += blockSize;
  }

  // Adler-32 checksum
  let a = 1, b = 0;
  for (let i = 0; i < data.length; i++) {
    a = (a + data[i]) % 65521;
    b = (b + a) % 65521;
  }
  const adler = ((b << 16) | a) >>> 0;
  result.push(...uint32(adler));

  return result;
}

// CRC-32 table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(data) {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = crcTable[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Generate icons
const dir = 'src/assets';
if (!existsSync(dir)) {
  mkdirSync(dir, { recursive: true });
}

for (const size of [16, 48, 128]) {
  const png = createPNG(size);
  writeFileSync(`${dir}/icon-${size}.png`, png);
  console.log(`Generated icon-${size}.png (${png.length} bytes)`);
}

console.log('Done!');
