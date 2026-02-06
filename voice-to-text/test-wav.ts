import { encodeWav } from "./src/utils/wav-encoder.js";

const sampleRate = 16000;
const durationSec = 0.5;
const numSamples = sampleRate * durationSec;
const pcmBuffer = Buffer.alloc(numSamples * 2);

const wavBuffer = encodeWav(pcmBuffer, 16000, 1, 16);
console.log("WAV buffer created successfully");
console.log("Size:", wavBuffer.length, "bytes");
console.log("Expected:", 44 + pcmBuffer.length, "bytes");
console.log("Header check (RIFF):", wavBuffer.slice(0, 4).toString());
console.log("Header check (WAVE):", wavBuffer.slice(8, 12).toString());
