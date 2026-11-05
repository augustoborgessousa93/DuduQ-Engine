#!/usr/bin/env node
/**
 * Remove detached pixels and diffuse alpha glow from an already-generated PNG.
 *
 * This is deliberately a geometry-neutral QA normalizer: RGB values and every
 * retained alpha value stay byte-for-byte unchanged. Only pixels outside the
 * expected opaque subject components (plus a small antialias radius) are made
 * fully transparent. The source file is never overwritten.
 */
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { deflateSync, inflateSync } from 'node:zlib';
import path from 'node:path';

const args = new Map();
for (let i = 2; i < process.argv.length; i += 1) {
  const token = process.argv[i];
  if (!token.startsWith('--')) continue;
  const [name, inline] = token.slice(2).split('=', 2);
  args.set(name, inline ?? process.argv[++i]);
}

const input = path.resolve(String(args.get('input') || ''));
const output = path.resolve(String(args.get('output') || ''));
const expectedComponents = Number(args.get('components') || 1);
const coreAlpha = Number(args.get('core-alpha') || 128);
const edgeRadius = Number(args.get('edge-radius') || 3);
const minWidth = Number(args.get('min-width') || 0);
const minHeight = Number(args.get('min-height') || 0);
const root = process.cwd();
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

if (!args.get('input') || !args.get('output')) throw new Error('USAGE: --input FILE --output FILE [--components N] [--core-alpha 128] [--edge-radius 3]');
if (input === output) throw new Error('SOURCE_OVERWRITE_FORBIDDEN');
if (!(output === root || output.startsWith(root + path.sep))) throw new Error('OUTPUT_OUTSIDE_WORKSPACE');
if (!Number.isInteger(expectedComponents) || expectedComponents < 1 || expectedComponents > 16) throw new Error('INVALID_COMPONENT_COUNT');
if (!Number.isInteger(coreAlpha) || coreAlpha < 1 || coreAlpha > 254) throw new Error('INVALID_CORE_ALPHA');
if (!Number.isInteger(edgeRadius) || edgeRadius < 0 || edgeRadius > 8) throw new Error('INVALID_EDGE_RADIUS');
if (!Number.isInteger(minWidth) || !Number.isInteger(minHeight) || minWidth < 0 || minHeight < 0 || minWidth > 4096 || minHeight > 4096) {
  throw new Error('INVALID_MINIMUM_CANVAS');
}

const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function decodePng(bytes) {
  if (!bytes.subarray(0, 8).equals(signature)) throw new Error('NOT_PNG');
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  const bitDepth = bytes[24];
  const colorType = bytes[25];
  const interlace = bytes[28];
  if (!width || !height || width * height > 20_000_000 || bitDepth !== 8 || colorType !== 6 || interlace !== 0) {
    throw new Error('REQUIRES_NONINTERLACED_RGBA8_PNG');
  }
  const chunks = [];
  let offset = 8;
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString('ascii', offset + 4, offset + 8);
    const end = offset + 12 + length;
    if (end > bytes.length) throw new Error('TRUNCATED_PNG');
    if (type === 'IDAT') chunks.push(bytes.subarray(offset + 8, offset + 8 + length));
    if (type === 'IEND') break;
    offset = end;
  }
  if (!chunks.length) throw new Error('PNG_MISSING_IDAT');
  const channels = 4;
  const stride = width * channels;
  const filtered = inflateSync(Buffer.concat(chunks), { maxOutputLength: (stride + 1) * height });
  if (filtered.length !== (stride + 1) * height) throw new Error('PNG_DECODE_LENGTH_MISMATCH');
  const pixels = Buffer.alloc(stride * height);
  let previous = Buffer.alloc(stride);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (stride + 1);
    const filter = filtered[rowStart];
    const row = Buffer.from(filtered.subarray(rowStart + 1, rowStart + 1 + stride));
    for (let i = 0; i < stride; i += 1) {
      const left = i >= channels ? row[i - channels] : 0;
      const up = previous[i];
      const upLeft = i >= channels ? previous[i - channels] : 0;
      if (filter === 1) row[i] = (row[i] + left) & 255;
      else if (filter === 2) row[i] = (row[i] + up) & 255;
      else if (filter === 3) row[i] = (row[i] + Math.floor((left + up) / 2)) & 255;
      else if (filter === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left), pb = Math.abs(p - up), pc = Math.abs(p - upLeft);
        row[i] = (row[i] + (pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft)) & 255;
      } else if (filter !== 0) throw new Error('INVALID_PNG_FILTER');
    }
    row.copy(pixels, y * stride);
    previous = row;
  }
  return { width, height, pixels };
}

function findCoreComponents({ width, height, pixels }) {
  const size = width * height;
  const visited = new Uint8Array(size);
  const components = [];
  const queue = new Int32Array(size);
  for (let start = 0; start < size; start += 1) {
    if (visited[start] || pixels[start * 4 + 3] < coreAlpha) continue;
    let head = 0, tail = 0;
    queue[tail++] = start;
    visited[start] = 1;
    const members = [];
    while (head < tail) {
      const index = queue[head++];
      members.push(index);
      const x = index % width, y = Math.floor(index / width);
      for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) {
        if ((!dx && !dy) || x + dx < 0 || x + dx >= width || y + dy < 0 || y + dy >= height) continue;
        const next = index + dy * width + dx;
        if (!visited[next] && pixels[next * 4 + 3] >= coreAlpha) {
          visited[next] = 1;
          queue[tail++] = next;
        }
      }
    }
    components.push(members);
  }
  return components.sort((a, b) => b.length - a.length);
}

function retainExpectedSubjects(image) {
  const { width, height, pixels } = image;
  const size = width * height;
  const components = findCoreComponents(image);
  if (components.length < expectedComponents) throw new Error(`EXPECTED_${expectedComponents}_CORE_COMPONENTS_FOUND_${components.length}`);
  const retained = components.slice(0, expectedComponents);
  const smallestRetained = retained.at(-1).length;
  if (smallestRetained < 256) throw new Error('EXPECTED_SUBJECT_COMPONENT_TOO_SMALL');
  const unexpectedLargest = components[expectedComponents]?.length || 0;
  if (unexpectedLargest > smallestRetained * 0.35) throw new Error('AMBIGUOUS_EXTRA_OPAQUE_COMPONENT');

  const allowed = new Uint8Array(size);
  const distance = new Int8Array(size);
  distance.fill(-1);
  const queue = new Int32Array(size);
  let head = 0, tail = 0;
  for (const component of retained) for (const index of component) {
    if (!allowed[index]) {
      allowed[index] = 1;
      distance[index] = 0;
      queue[tail++] = index;
    }
  }
  while (head < tail) {
    const index = queue[head++];
    if (distance[index] >= edgeRadius) continue;
    const x = index % width, y = Math.floor(index / width);
    for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) {
      if ((!dx && !dy) || x + dx < 0 || x + dx >= width || y + dy < 0 || y + dy >= height) continue;
      const next = index + dy * width + dx;
      if (distance[next] !== -1 || pixels[next * 4 + 3] === 0) continue;
      allowed[next] = 1;
      distance[next] = distance[index] + 1;
      queue[tail++] = next;
    }
  }

  let initialVisible = 0, finalVisible = 0;
  for (let index = 0; index < size; index += 1) {
    const alphaOffset = index * 4 + 3;
    if (pixels[alphaOffset] > 0) initialVisible += 1;
    if (!allowed[index]) {
      pixels[index * 4] = 0;
      pixels[index * 4 + 1] = 0;
      pixels[index * 4 + 2] = 0;
      pixels[alphaOffset] = 0;
    } else if (pixels[alphaOffset] > 0) finalVisible += 1;
  }
  return {
    retainedComponentPixels: retained.map((component) => component.length),
    unexpectedCoreComponentPixels: unexpectedLargest,
    initialVisiblePixels: initialVisible,
    finalVisiblePixels: finalVisible,
    removedVisiblePixels: initialVisible - finalVisible
  };
}

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n += 1) {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[n] = c >>> 0;
}
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data = Buffer.alloc(0)) {
  const name = Buffer.from(type, 'ascii');
  const body = Buffer.concat([name, data]);
  const out = Buffer.alloc(data.length + 12);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(crc32(body), data.length + 8);
  return out;
}
function encodePng({ width, height, pixels }) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([signature, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND')]);
}

function padToMinimumCanvas(image) {
  const width = Math.max(image.width, minWidth);
  const height = Math.max(image.height, minHeight);
  if (width === image.width && height === image.height) return { image, padLeft: 0, padTop: 0 };
  const pixels = Buffer.alloc(width * height * 4);
  const padLeft = Math.floor((width - image.width) / 2);
  const padTop = Math.floor((height - image.height) / 2);
  for (let y = 0; y < image.height; y += 1) {
    image.pixels.copy(
      pixels,
      ((y + padTop) * width + padLeft) * 4,
      y * image.width * 4,
      (y + 1) * image.width * 4
    );
  }
  return { image: { width, height, pixels }, padLeft, padTop };
}

const source = await readFile(input);
const decoded = decodePng(source);
const cleanup = retainExpectedSubjects(decoded);
const padded = padToMinimumCanvas(decoded);
const image = padded.image;
const normalized = encodePng(image);
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, normalized);
console.log(JSON.stringify({
  status: 'ALPHA_NORMALIZED',
  input,
  output,
  width: image.width,
  height: image.height,
  expectedComponents,
  coreAlpha,
  edgeRadius,
  minWidth,
  minHeight,
  padLeft: padded.padLeft,
  padTop: padded.padTop,
  sourceSha256: sha256(source),
  outputSha256: sha256(normalized),
  ...cleanup
}));
