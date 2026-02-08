import { describe, expect, test } from "bun:test";
import { encodeWav } from "../../utils/wav-encoder.js";

describe("encodeWav", () => {
  const sampleRate = 44100;
  const numChannels = 1;
  const bitDepth = 16;
  const pcm = Buffer.from([0x01, 0x02, 0x03, 0x04]);

  function encode(
    buf = pcm,
    sr = sampleRate,
    ch = numChannels,
    bd = bitDepth,
  ): Buffer {
    return encodeWav(buf, sr, ch, bd);
  }

  test("RIFF signature at offset 0", () => {
    const wav = encode();
    expect(wav.toString("ascii", 0, 4)).toBe("RIFF");
  });

  test("WAVE signature at offset 8", () => {
    const wav = encode();
    expect(wav.toString("ascii", 8, 12)).toBe("WAVE");
  });

  test("file size at offset 4 equals headerSize + dataSize - 8", () => {
    const wav = encode();
    const fileSize = wav.readUInt32LE(4);
    expect(fileSize).toBe(44 + pcm.length - 8);
  });

  test("fmt chunk identifier at offset 12", () => {
    const wav = encode();
    expect(wav.toString("ascii", 12, 16)).toBe("fmt ");
  });

  test("fmt chunk size is 16 at offset 16", () => {
    const wav = encode();
    expect(wav.readUInt32LE(16)).toBe(16);
  });

  test("audio format is PCM (1) at offset 20", () => {
    const wav = encode();
    expect(wav.readUInt16LE(20)).toBe(1);
  });

  test("channels at offset 22", () => {
    const mono = encode(pcm, sampleRate, 1, bitDepth);
    expect(mono.readUInt16LE(22)).toBe(1);

    const stereo = encode(pcm, sampleRate, 2, bitDepth);
    expect(stereo.readUInt16LE(22)).toBe(2);
  });

  test("sample rate at offset 24", () => {
    const wav = encode();
    expect(wav.readUInt32LE(24)).toBe(44100);
  });

  test("byte rate at offset 28 equals sampleRate * numChannels * bitDepth / 8", () => {
    const wav = encode(pcm, 44100, 1, 16);
    expect(wav.readUInt32LE(28)).toBe((44100 * 1 * 16) / 8);

    const stereo24 = encode(pcm, 48000, 2, 24);
    expect(stereo24.readUInt32LE(28)).toBe((48000 * 2 * 24) / 8);
  });

  test("block align at offset 32 equals numChannels * bitDepth / 8", () => {
    const mono16 = encode(pcm, sampleRate, 1, 16);
    expect(mono16.readUInt16LE(32)).toBe((1 * 16) / 8);

    const stereo16 = encode(pcm, sampleRate, 2, 16);
    expect(stereo16.readUInt16LE(32)).toBe((2 * 16) / 8);
  });

  test("bit depth at offset 34", () => {
    const wav8 = encode(pcm, sampleRate, 1, 8);
    expect(wav8.readUInt16LE(34)).toBe(8);

    const wav16 = encode(pcm, sampleRate, 1, 16);
    expect(wav16.readUInt16LE(34)).toBe(16);

    const wav24 = encode(pcm, sampleRate, 1, 24);
    expect(wav24.readUInt16LE(34)).toBe(24);
  });

  test("data chunk identifier at offset 36", () => {
    const wav = encode();
    expect(wav.toString("ascii", 36, 40)).toBe("data");
  });

  test("data size at offset 40 equals PCM buffer length", () => {
    const wav = encode();
    expect(wav.readUInt32LE(40)).toBe(pcm.length);
  });

  test("PCM data appended starting at byte 44", () => {
    const wav = encode();
    const appended = wav.subarray(44);
    expect(Buffer.compare(appended, pcm)).toBe(0);
  });

  test("total buffer length is 44 + pcmBuffer.length", () => {
    const wav = encode();
    expect(wav.length).toBe(44 + pcm.length);
  });

  test("empty PCM buffer produces 44-byte header only", () => {
    const wav = encode(Buffer.alloc(0));
    expect(wav.length).toBe(44);
    expect(wav.readUInt32LE(40)).toBe(0);
    expect(wav.readUInt32LE(4)).toBe(44 + 0 - 8);
  });

  test("mono 8-bit variation", () => {
    const wav = encode(pcm, 22050, 1, 8);
    expect(wav.readUInt16LE(22)).toBe(1);
    expect(wav.readUInt32LE(24)).toBe(22050);
    expect(wav.readUInt16LE(34)).toBe(8);
    expect(wav.readUInt32LE(28)).toBe((22050 * 1 * 8) / 8);
    expect(wav.readUInt16LE(32)).toBe(1);
  });

  test("stereo 16-bit variation", () => {
    const wav = encode(pcm, 48000, 2, 16);
    expect(wav.readUInt16LE(22)).toBe(2);
    expect(wav.readUInt32LE(24)).toBe(48000);
    expect(wav.readUInt16LE(34)).toBe(16);
    expect(wav.readUInt32LE(28)).toBe((48000 * 2 * 16) / 8);
    expect(wav.readUInt16LE(32)).toBe(4);
  });

  test("stereo 24-bit variation", () => {
    const wav = encode(pcm, 96000, 2, 24);
    expect(wav.readUInt16LE(22)).toBe(2);
    expect(wav.readUInt32LE(24)).toBe(96000);
    expect(wav.readUInt16LE(34)).toBe(24);
    expect(wav.readUInt32LE(28)).toBe((96000 * 2 * 24) / 8);
    expect(wav.readUInt16LE(32)).toBe(6);
  });
});
