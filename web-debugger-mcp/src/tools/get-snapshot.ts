import { requestSnapshot } from "../lib/snapshot-handler.js";
import { handleError, type ErrorResponse } from "../lib/errors.js";

export async function getSnapshotTool(
  provider: string,
  outputDir: string,
): Promise<{ snapshotFile: string; provider: string } | ErrorResponse> {
  try {
    const snapshotFile = await requestSnapshot(provider, outputDir);
    return { snapshotFile, provider };
  } catch (error) {
    return handleError(error);
  }
}
