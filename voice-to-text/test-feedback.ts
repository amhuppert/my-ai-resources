import { createFeedbackService } from "./src/services/feedback.js";
import type { Config } from "./src/types.js";

const config: Config = {
  hotkey: "F9",
  beepEnabled: true,
  notificationEnabled: true,
  terminalOutputEnabled: true,
  maxRecordingDuration: 300,
};

const feedback = createFeedbackService(config);

console.log("Testing feedback service...");

feedback.log("Test log message");
feedback.showNotification("Test Title", "Test notification message");

await feedback.playStartBeep();
console.log("Start beep played");

await feedback.playStopBeep();
console.log("Stop beep played");

console.log("All feedback tests completed!");
