import "server-only";
import { inflateRawSync } from "node:zlib";

const MAX_TOTAL_SIZE = 40 * 1024 * 1024;

export type ExtractedZipImage = { filename: string; mimeType: string; data: Buffer };

function imageMime(filename: string, data: Buffer) {
  const extension = filename.split(".").pop()?.toLowerCase();
  if ((extension === "jpg" || extension === "jpeg") && data[0] === 0xff && data[1] === 0xd8) return "image/jpeg";
  if (extension === "png" && data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
    return "image/png";
  if (
    extension === "webp" &&
    data.subarray(0, 4).toString("ascii") === "RIFF" &&
    data.subarray(8, 12).toString("ascii") === "WEBP"
  )
    return "image/webp";
  return null;
}

export function extractImagesFromZip(zip: Buffer): ExtractedZipImage[] {
  let endOffset = -1;
  for (let offset = zip.length - 22; offset >= Math.max(0, zip.length - 65_557); offset -= 1) {
    if (zip.readUInt32LE(offset) === 0x06054b50) {
      endOffset = offset;
      break;
    }
  }
  if (endOffset < 0) throw new Error("ZIP_INVALID");

  const entryCount = zip.readUInt16LE(endOffset + 10);
  let offset = zip.readUInt32LE(endOffset + 16);
  const images: ExtractedZipImage[] = [];
  let totalSize = 0;

  for (let index = 0; index < entryCount; index += 1) {
    if (offset + 46 > zip.length || zip.readUInt32LE(offset) !== 0x02014b50) throw new Error("ZIP_INVALID");
    const flags = zip.readUInt16LE(offset + 8);
    const method = zip.readUInt16LE(offset + 10);
    const compressedSize = zip.readUInt32LE(offset + 20);
    const uncompressedSize = zip.readUInt32LE(offset + 24);
    const nameLength = zip.readUInt16LE(offset + 28);
    const extraLength = zip.readUInt16LE(offset + 30);
    const commentLength = zip.readUInt16LE(offset + 32);
    const localOffset = zip.readUInt32LE(offset + 42);
    const filename = zip
      .subarray(offset + 46, offset + 46 + nameLength)
      .toString("utf8")
      .replace(/\\/g, "/");
    offset += 46 + nameLength + extraLength + commentLength;

    if ((flags & 1) !== 0) throw new Error("ZIP_ENCRYPTED");
    if (!/\.(?:jpe?g|png|webp)$/i.test(filename) || filename.startsWith("__MACOSX/")) continue;
    const remainingSize = MAX_TOTAL_SIZE - totalSize;
    if (uncompressedSize > remainingSize) throw new Error("ZIP_LIMIT");
    if (localOffset + 30 > zip.length || zip.readUInt32LE(localOffset) !== 0x04034b50) throw new Error("ZIP_INVALID");
    const localNameLength = zip.readUInt16LE(localOffset + 26);
    const localExtraLength = zip.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    if (dataStart + compressedSize > zip.length) throw new Error("ZIP_INVALID");
    const compressed = zip.subarray(dataStart, dataStart + compressedSize);
    const data =
      method === 0
        ? Buffer.from(compressed)
        : method === 8
          ? inflateRawSync(compressed, { maxOutputLength: Math.max(1, remainingSize) })
          : null;
    if (!data || data.length !== uncompressedSize) throw new Error("ZIP_UNSUPPORTED");
    const mimeType = imageMime(filename, data);
    if (!mimeType) throw new Error("ZIP_IMAGE_INVALID");
    totalSize += data.length;
    if (totalSize > MAX_TOTAL_SIZE) throw new Error("ZIP_LIMIT");
    images.push({ filename: filename.split("/").pop() ?? `imagen-${index + 1}`, mimeType, data });
  }

  if (!images.length) throw new Error("ZIP_EMPTY");
  return images;
}
