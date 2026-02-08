import {
  describe,
  expect,
  test,
  beforeEach,
  afterEach,
  spyOn,
  mock,
} from "bun:test";
import type { Config } from "../../types.js";

// Mutable flag to control play error behavior
let playError: Error | null = null;
let playCalls: string[] = [];
let notifyCalls: { title: string; message: string; sound: boolean }[] = [];

mock.module("play-sound", () => ({
  default: () => ({
    play: (path: string, callback: (err: Error | null) => void) => {
      playCalls.push(path);
      callback(playError);
    },
  }),
}));

mock.module("node-notifier", () => ({
  default: {
    notify: (opts: { title: string; message: string; sound: boolean }) => {
      notifyCalls.push(opts);
    },
  },
}));

const { createFeedbackService } = await import("../../services/feedback.js");

function makeConfig(overrides: Partial<Config> = {}): Config {
  return {
    hotkey: "F9",
    autoInsert: true,
    beepEnabled: true,
    notificationEnabled: true,
    terminalOutputEnabled: true,
    maxRecordingDuration: 300,
    ...overrides,
  };
}

describe("FeedbackService", () => {
  let logSpy: ReturnType<typeof spyOn>;
  let errorSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    playCalls = [];
    notifyCalls = [];
    playError = null;
    logSpy = spyOn(console, "log").mockImplementation(() => {});
    errorSpy = spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  describe("log()", () => {
    test("outputs with timestamp when terminalOutputEnabled is true", () => {
      const svc = createFeedbackService(makeConfig());
      svc.log("hello");
      expect(logSpy).toHaveBeenCalledTimes(1);
      const output = logSpy.mock.calls[0][0] as string;
      expect(output).toMatch(/^\[.+\] hello$/);
    });

    test("is silent when terminalOutputEnabled is false", () => {
      const svc = createFeedbackService(
        makeConfig({ terminalOutputEnabled: false }),
      );
      svc.log("hello");
      expect(logSpy).not.toHaveBeenCalled();
    });
  });

  describe("verboseLog()", () => {
    test("no output when verbose is false", () => {
      const svc = createFeedbackService(makeConfig(), false);
      svc.verboseLog("Test", "content");
      expect(logSpy).not.toHaveBeenCalled();
    });

    test("label-only format when content is undefined", () => {
      const svc = createFeedbackService(makeConfig(), true);
      svc.verboseLog("MyLabel");
      expect(logSpy).toHaveBeenCalledTimes(1);
      const output = logSpy.mock.calls[0][0] as string;
      expect(output).toMatch(/\[VERBOSE\] MyLabel$/);
    });

    test("single-line inline format when content has no newlines", () => {
      const svc = createFeedbackService(makeConfig(), true);
      svc.verboseLog("Key", "value");
      expect(logSpy).toHaveBeenCalledTimes(1);
      const output = logSpy.mock.calls[0][0] as string;
      expect(output).toMatch(/\[VERBOSE\] Key: value$/);
    });

    test("multi-line format with separators when content has newlines", () => {
      const svc = createFeedbackService(makeConfig(), true);
      svc.verboseLog("Data", "line1\nline2");
      expect(logSpy).toHaveBeenCalledTimes(4);

      const header = logSpy.mock.calls[0][0] as string;
      expect(header).toMatch(/\[VERBOSE\] Data:$/);

      const sep1 = logSpy.mock.calls[1][0] as string;
      expect(sep1).toMatch(/^─+$/);

      const content = logSpy.mock.calls[2][0] as string;
      expect(content).toBe("line1\nline2");

      const sep2 = logSpy.mock.calls[3][0] as string;
      expect(sep2).toMatch(/^─+$/);
    });
  });

  describe("beeps", () => {
    test("plays correct WAV file when beepEnabled is true", async () => {
      const svc = createFeedbackService(makeConfig({ beepEnabled: true }));

      await svc.playStartBeep();
      expect(playCalls).toHaveLength(1);
      expect(playCalls[0]).toContain("start.wav");

      playCalls = [];
      await svc.playStopBeep();
      expect(playCalls[0]).toContain("stop.wav");

      playCalls = [];
      await svc.playReadyBeep();
      expect(playCalls[0]).toContain("ready.wav");
    });

    test("skips playing when beepEnabled is false", async () => {
      const svc = createFeedbackService(makeConfig({ beepEnabled: false }));
      await svc.playStartBeep();
      await svc.playStopBeep();
      await svc.playReadyBeep();
      expect(playCalls).toHaveLength(0);
    });

    test("resolves even when play reports an error", async () => {
      playError = new Error("audio device busy");
      const svc = createFeedbackService(makeConfig({ beepEnabled: true }));
      await svc.playStartBeep();
      expect(errorSpy).toHaveBeenCalled();
      const errOutput = errorSpy.mock.calls[0][0] as string;
      expect(errOutput).toContain("audio device busy");
    });
  });

  describe("showNotification()", () => {
    test("calls notifier when notificationEnabled is true", () => {
      const svc = createFeedbackService(
        makeConfig({ notificationEnabled: true }),
      );
      svc.showNotification("Title", "Body");
      expect(notifyCalls).toHaveLength(1);
      expect(notifyCalls[0].title).toBe("Title");
      expect(notifyCalls[0].message).toBe("Body");
      expect(notifyCalls[0].sound).toBe(false);
    });

    test("skips notification when notificationEnabled is false", () => {
      const svc = createFeedbackService(
        makeConfig({ notificationEnabled: false }),
      );
      svc.showNotification("Title", "Body");
      expect(notifyCalls).toHaveLength(0);
    });
  });
});
