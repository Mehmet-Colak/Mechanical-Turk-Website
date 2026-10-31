// Shrinks an uploaded PNG for use as motif art, with no image library. Used only by
// build.mjs. Averages every source pixel into its target pixel, so fine lines survive
// the downscale instead of being dropped.
import zlib from "node:zlib";

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

export function pngSize(buf) {
  if (buf.length < 24 || !buf.subarray(0, 8).equals(SIGNATURE)) return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

// RGBA pixels, or null for the rarer formats (16-bit, interlaced, under 8-bit).
function decode(buf) {
  let width, height, type, palette, trns;
  const idat = [];
  for (let i = 8; i + 8 <= buf.length;) {
    const len = buf.readUInt32BE(i);
    const name = buf.toString("latin1", i + 4, i + 8);
    const body = buf.subarray(i + 8, i + 8 + len);
    if (name === "IHDR") {
      width = body.readUInt32BE(0); height = body.readUInt32BE(4); type = body[9];
      if (body[8] !== 8 || body[12] !== 0 || !CHANNELS[type]) return null;
    } else if (name === "PLTE") palette = body;
    else if (name === "tRNS") trns = body;
    else if (name === "IDAT") idat.push(body);
    i += 12 + len;
  }
  if (!width || !idat.length || (type === 3 && !palette)) return null;

  const raw = zlib.inflateSync(Buffer.concat(idat));
  const ch = CHANNELS[type];
  const stride = width * ch;
  const rgba = new Uint8Array(width * height * 4);
  let prev = new Uint8Array(stride);
  for (let y = 0; y < height; y++) {
    const start = y * (stride + 1);
    const filter = raw[start];
    const line = new Uint8Array(raw.subarray(start + 1, start + 1 + stride));
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? line[x - ch] : 0;
      const b = prev[x];
      const c = x >= ch ? prev[x - ch] : 0;
      let add = 0;
      if (filter === 1) add = a;
      else if (filter === 2) add = b;
      else if (filter === 3) add = (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        add = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      line[x] = (line[x] + add) & 255;
    }
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4;
      const s = x * ch;
      if (type === 6) { rgba[o] = line[s]; rgba[o + 1] = line[s + 1]; rgba[o + 2] = line[s + 2]; rgba[o + 3] = line[s + 3]; }
      else if (type === 2) { rgba[o] = line[s]; rgba[o + 1] = line[s + 1]; rgba[o + 2] = line[s + 2]; rgba[o + 3] = 255; }
      else if (type === 4) { rgba[o] = rgba[o + 1] = rgba[o + 2] = line[s]; rgba[o + 3] = line[s + 1]; }
      else if (type === 0) { rgba[o] = rgba[o + 1] = rgba[o + 2] = line[s]; rgba[o + 3] = 255; }
      else {
        const p = line[s] * 3;
        rgba[o] = palette[p]; rgba[o + 1] = palette[p + 1]; rgba[o + 2] = palette[p + 2];
        rgba[o + 3] = trns && line[s] < trns.length ? trns[line[s]] : 255;
      }
    }
    prev = line;
  }
  return { width, height, rgba };
}

// Weighted by alpha, so fully transparent pixels can't tint the edges of the art.
function shrink({ width, height, rgba }, w, h) {
  const sum = new Float64Array(w * h * 4);
  const count = new Float64Array(w * h);
  for (let y = 0; y < height; y++) {
    const ty = Math.min(h - 1, Math.floor((y * h) / height));
    for (let x = 0; x < width; x++) {
      const t = ty * w + Math.min(w - 1, Math.floor((x * w) / width));
      const s = (y * width + x) * 4;
      const a = rgba[s + 3];
      sum[t * 4] += rgba[s] * a; sum[t * 4 + 1] += rgba[s + 1] * a; sum[t * 4 + 2] += rgba[s + 2] * a; sum[t * 4 + 3] += a;
      count[t]++;
    }
  }
  const out = new Uint8Array(w * h * 4);
  for (let t = 0; t < w * h; t++) {
    const a = sum[t * 4 + 3];
    if (!a) continue;
    out[t * 4] = Math.round(sum[t * 4] / a); out[t * 4 + 1] = Math.round(sum[t * 4 + 1] / a); out[t * 4 + 2] = Math.round(sum[t * 4 + 2] / a);
    out[t * 4 + 3] = Math.round(a / count[t]);
  }
  return out;
}

function crc32(buf) {
  let crc = ~0;
  for (const byte of buf) {
    crc ^= byte;
    for (let k = 0; k < 8; k++) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
  }
  return ~crc >>> 0;
}

function encode(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) Buffer.from(rgba.buffer, y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const chunk = (name, body) => {
    const head = Buffer.from(name, "latin1");
    const len = Buffer.alloc(4); len.writeUInt32BE(body.length);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([head, body])));
    return Buffer.concat([len, head, body, crc]);
  };
  return Buffer.concat([SIGNATURE, chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}

// The PNG scaled so its longest side is `max`, or null if it can't be read.
export function resizePng(buf, max) {
  const img = decode(buf);
  if (!img) return null;
  const scale = max / Math.max(img.width, img.height);
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  return encode(w, h, shrink(img, w, h));
}
