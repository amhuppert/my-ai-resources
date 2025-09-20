export interface KeybindingEntry {
  key: string;
  command: string;
  when?: string;
  args?: Record<string, unknown>;
}

export interface ShortcutRecommendation {
  keystroke: string;
  mnemonic: string;
  justification: string;
  conflicts: Array<{
    keystroke: string;
    mnemonic: string;
  }>;
}

export interface ShortcutRecommendationResponse {
  when: string;
  recommendations: ShortcutRecommendation[];
  errors: string[];
}

export interface OpenAIRequestVariables {
  frequency: string;
  task_description: string;
  operating_system: string;
  existing_shortcuts: string;
}

export class KeybindingsError extends Error {
  constructor(
    message: string,
    public cause?: Error,
  ) {
    super(message);
    this.name = "KeybindingsError";
  }
}

export class FileOperationError extends Error {
  constructor(
    message: string,
    public cause?: Error,
  ) {
    super(message);
    this.name = "FileOperationError";
  }
}

export class OpenAIError extends Error {
  constructor(
    message: string,
    public cause?: Error,
  ) {
    super(message);
    this.name = "OpenAIError";
  }
}
