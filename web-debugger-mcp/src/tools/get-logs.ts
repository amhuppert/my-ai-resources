import { getCurrentSession } from "../lib/session.js";
import type { ErrorResponse } from "../lib/errors.js";

export function getLogs(): { logFile: string } | ErrorResponse {
  const session = getCurrentSession();
  if (!session) {
    return {
      error: {
        type: "no_session",
        message: "No active session. Is the web app running?",
      },
    };
  }
  return { logFile: session.logFile };
}
