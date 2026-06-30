type ImageDimensions = {
  width: number | null;
  height: number | null;
};

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export function detectImageDimensionsFromBuffer(
  buffer: Buffer,
  mimeType: string | null | undefined,
): ImageDimensions {
  const normalizedMime = mimeType?.split(';')[0]?.trim().toLowerCase() ?? '';

  return (
    parseByMime(buffer, normalizedMime) ??
    parsePngDimensions(buffer) ??
    parseJpegDimensions(buffer) ??
    parseGifDimensions(buffer) ??
    parseWebpDimensions(buffer) ??
    parseAvifDimensions(buffer) ?? { width: null, height: null }
  );
}

function parseByMime(buffer: Buffer, mimeType: string): ImageDimensions | null {
  switch (mimeType) {
    case 'image/png':
      return parsePngDimensions(buffer);
    case 'image/jpeg':
      return parseJpegDimensions(buffer);
    case 'image/gif':
      return parseGifDimensions(buffer);
    case 'image/webp':
      return parseWebpDimensions(buffer);
    case 'image/avif':
      return parseAvifDimensions(buffer);
    default:
      return null;
  }
}

function parsePngDimensions(buffer: Buffer): ImageDimensions | null {
  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return null;
  }

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function parseGifDimensions(buffer: Buffer): ImageDimensions | null {
  if (buffer.length < 10) {
    return null;
  }

  const header = buffer.subarray(0, 6).toString('ascii');
  if (header !== 'GIF87a' && header !== 'GIF89a') {
    return null;
  }

  return {
    width: buffer.readUInt16LE(6),
    height: buffer.readUInt16LE(8),
  };
}

function parseJpegDimensions(buffer: Buffer): ImageDimensions | null {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return null;
  }

  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = buffer[offset + 1];
    if (marker === 0xd8 || marker === 0xd9) {
      offset += 2;
      continue;
    }

    if (offset + 4 > buffer.length) {
      return null;
    }

    const segmentLength = buffer.readUInt16BE(offset + 2);
    if (segmentLength < 2 || offset + 2 + segmentLength > buffer.length) {
      return null;
    }

    if (isStartOfFrameMarker(marker)) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      };
    }

    offset += 2 + segmentLength;
  }

  return null;
}

function isStartOfFrameMarker(marker: number): boolean {
  return (
    (marker >= 0xc0 && marker <= 0xc3) ||
    (marker >= 0xc5 && marker <= 0xc7) ||
    (marker >= 0xc9 && marker <= 0xcb) ||
    (marker >= 0xcd && marker <= 0xcf)
  );
}

function parseWebpDimensions(buffer: Buffer): ImageDimensions | null {
  if (
    buffer.length < 30 ||
    buffer.subarray(0, 4).toString('ascii') !== 'RIFF' ||
    buffer.subarray(8, 12).toString('ascii') !== 'WEBP'
  ) {
    return null;
  }

  const chunkType = buffer.subarray(12, 16).toString('ascii');

  if (chunkType === 'VP8X' && buffer.length >= 30) {
    const width = 1 + readUInt24LE(buffer, 24);
    const height = 1 + readUInt24LE(buffer, 27);
    return { width, height };
  }

  if (chunkType === 'VP8L' && buffer.length >= 25) {
    const packed = buffer.readUInt32LE(21);
    const width = (packed & 0x3fff) + 1;
    const height = ((packed >> 14) & 0x3fff) + 1;
    return { width, height };
  }

  if (chunkType === 'VP8 ' && buffer.length >= 30) {
    const width = buffer.readUInt16LE(26) & 0x3fff;
    const height = buffer.readUInt16LE(28) & 0x3fff;
    return { width, height };
  }

  return null;
}

function parseAvifDimensions(buffer: Buffer): ImageDimensions | null {
  const marker = Buffer.from('ispe');

  for (let index = 0; index <= buffer.length - marker.length; index += 1) {
    if (!buffer.subarray(index, index + marker.length).equals(marker)) {
      continue;
    }

    const widthOffset = index + 8;
    const heightOffset = index + 12;
    if (heightOffset + 4 > buffer.length) {
      continue;
    }

    return {
      width: buffer.readUInt32BE(widthOffset),
      height: buffer.readUInt32BE(heightOffset),
    };
  }

  return null;
}

function readUInt24LE(buffer: Buffer, offset: number): number {
  return buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16);
}
