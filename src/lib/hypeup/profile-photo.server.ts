import { PROFILE_PHOTO_BYTES, PROFILE_PHOTO_DIMENSION } from "./profile-photo";

export function isProfileJpeg(base64: string): boolean {
  if (base64.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64))
    return false;
  const bytes = Buffer.from(base64, "base64");
  if (
    bytes.length < 12 ||
    bytes.length > PROFILE_PHOTO_BYTES ||
    bytes.readUInt16BE(0) !== 0xffd8 ||
    bytes.readUInt16BE(bytes.length - 2) !== 0xffd9
  )
    return false;

  // Read the dimensions from the JPEG frame before accepting the image.
  let offset = 2;
  while (offset + 4 < bytes.length && bytes[offset] === 0xff) {
    while (bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset++];
    if (
      !marker ||
      marker === 0xda ||
      marker === 0xd9 ||
      offset + 2 > bytes.length
    )
      break;
    const length = bytes.readUInt16BE(offset);
    if (length < 2 || offset + length > bytes.length) break;
    if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
      if (length < 8) break;
      const height = bytes.readUInt16BE(offset + 3);
      const width = bytes.readUInt16BE(offset + 5);
      return (
        height > 0 &&
        width > 0 &&
        height <= PROFILE_PHOTO_DIMENSION &&
        width <= PROFILE_PHOTO_DIMENSION
      );
    }
    offset += length;
  }
  return false;
}
