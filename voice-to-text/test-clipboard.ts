import { copyToClipboard } from "./src/services/clipboard.js";

const testText = "Voice-to-text test: Hello, world!";
await copyToClipboard(testText);
console.log("Copied to clipboard:", testText);
