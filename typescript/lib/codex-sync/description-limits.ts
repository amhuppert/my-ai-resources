export const CODEX_MAX_DESCRIPTION_LENGTH = 1024;

export function truncateDescription(description: string): string {
  return description.slice(0, CODEX_MAX_DESCRIPTION_LENGTH);
}
