import { z } from "zod";

export const boardIdSchema = z.uuid();
export const sessionIdSchema = z.string().min(8).max(128);

const allowedAssetTypes = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
] as const;

export const assetMetadataSchema = z.object({
  boardId: z.uuid(),
  assetId: z.uuid(),
  contentType: z.enum(allowedAssetTypes),
  contentLength: z
    .number()
    .int()
    .positive()
    .max(20 * 1024 * 1024),
});

export function hasSupportedImageSignature(
  contentType: (typeof allowedAssetTypes)[number],
  bytes: Uint8Array,
): boolean {
  if (contentType === "image/png") {
    return (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47
    );
  }
  if (contentType === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (contentType === "image/webp") {
    return (
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
    );
  }
  return (
    contentType === "image/gif" &&
    ["GIF87a", "GIF89a"].includes(String.fromCharCode(...bytes.slice(0, 6)))
  );
}
