/**
 * Encode raw PCM data as a WAV file buffer.
 *
 * WAV Header Structure (44 bytes):
 * - Bytes 0-3: "RIFF"
 * - Bytes 4-7: File size - 8
 * - Bytes 8-11: "WAVE"
 * - Bytes 12-15: "fmt "
 * - Bytes 16-19: 16 (PCM format chunk size)
 * - Bytes 20-21: 1 (PCM format)
 * - Bytes 22-23: Number of channels
 * - Bytes 24-27: Sample rate
 * - Bytes 28-31: Byte rate (sampleRate * numChannels * bitDepth/8)
 * - Bytes 32-33: Block align (numChannels * bitDepth/8)
 * - Bytes 34-35: Bits per sample
 * - Bytes 36-39: "data"
 * - Bytes 40-43: Data size
 * - Bytes 44+: PCM data
 */
export function encodeWav(
  pcmBuffer: Buffer,
  sampleRate: number,
  numChannels: number,
  bitDepth: number,
): Buffer {
  const byteRate = (sampleRate * numChannels * bitDepth) / 8;
  const blockAlign = (numChannels * bitDepth) / 8;
  const dataSize = pcmBuffer.length;
  const headerSize = 44;
  const fileSize = headerSize + dataSize - 8;

  const header = Buffer.alloc(headerSize);

  // RIFF chunk descriptor
  header.write("RIFF", 0);
  header.writeUInt32LE(fileSize, 4);
  header.write("WAVE", 8);

  // fmt sub-chunk
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // PCM format chunk size
  header.writeUInt16LE(1, 20); // PCM format (1 = linear quantization)
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitDepth, 34);

  // data sub-chunk
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]);
}
