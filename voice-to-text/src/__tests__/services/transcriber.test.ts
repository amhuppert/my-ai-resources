import { describe, expect, test } from "bun:test";
import { getMimeInfo } from "../../services/transcriber.js";

describe("getMimeInfo", () => {
  test(".wav returns audio/wav", () => {
    const result = getMimeInfo("/tmp/recording.wav");
    expect(result).toEqual({ mime: "audio/wav", filename: "audio.wav" });
  });

  test(".webm returns audio/webm", () => {
    const result = getMimeInfo("/tmp/recording.webm");
    expect(result).toEqual({ mime: "audio/webm", filename: "audio.webm" });
  });

  test(".mp3 returns audio/mpeg", () => {
    const result = getMimeInfo("/tmp/recording.mp3");
    expect(result).toEqual({ mime: "audio/mpeg", filename: "audio.mp3" });
  });

  test(".ogg returns audio/ogg", () => {
    const result = getMimeInfo("/tmp/recording.ogg");
    expect(result).toEqual({ mime: "audio/ogg", filename: "audio.ogg" });
  });

  test(".flac returns audio/flac", () => {
    const result = getMimeInfo("/tmp/recording.flac");
    expect(result).toEqual({ mime: "audio/flac", filename: "audio.flac" });
  });

  test(".m4a returns audio/mp4", () => {
    const result = getMimeInfo("/tmp/recording.m4a");
    expect(result).toEqual({ mime: "audio/mp4", filename: "audio.m4a" });
  });

  test("unrecognized extension defaults to WAV", () => {
    const result = getMimeInfo("/tmp/recording.xyz");
    expect(result).toEqual({ mime: "audio/wav", filename: "audio.wav" });
  });

  test("uppercase extension is normalized", () => {
    const result = getMimeInfo("/tmp/recording.WEBM");
    expect(result).toEqual({ mime: "audio/webm", filename: "audio.webm" });
  });

  test("no extension defaults to WAV", () => {
    const result = getMimeInfo("/tmp/recording");
    expect(result).toEqual({ mime: "audio/wav", filename: "audio.wav" });
  });
});
