import { z } from "zod";
import { UsageError } from "./errors";
import { positionToOffset } from "./position";
import { formatError } from "./reporter";
import type { Session } from "./session";
import { EditPlanSchema } from "./types";

export interface ProtocolDeps {
  // Reads file text so a CLI/serve line:col position can be converted to an offset.
  readFileText: (filePath: string) => string;
  // Sink for apply warnings (e.g. --allow-stale); routed to stderr in serve mode
  // so stdout carries only protocol responses (R6.2).
  warn?: (msg: string) => void;
}

export interface RefactorRequest {
  id: string;
  op: string;
  params?: unknown;
}

export interface RefactorResponse {
  id: string;
  ok: boolean;
  result?: unknown;
  error?: { code: string; message: string };
}

const LineColPositionSchema = z
  .object({ line: z.number().int().positive(), column: z.number().int().positive() })
  .strict();

// A "line:col" string or a {line, column} object; both are 1-based.
const PositionParamSchema = z.union([z.string(), LineColPositionSchema]);

const LoadProjectParamsSchema = z
  .object({
    tsconfigPath: z.string(),
    scopeFiles: z.array(z.string()).optional(),
  })
  .strict();

const RenameParamsSchema = z
  .object({
    filePath: z.string(),
    position: PositionParamSchema.optional(),
    offset: z.number().int().nonnegative().optional(),
    to: z.string().min(1),
  })
  .strict();

const MoveParamsSchema = z
  .object({
    from: z.string(),
    to: z.string(),
  })
  .strict();

const ApplyParamsSchema = z
  .object({
    plan: EditPlanSchema.optional(),
    planId: z.string().optional(),
    allowStale: z.boolean().optional(),
  })
  .strict();

const EmptyParamsSchema = z.object({}).strict();

export async function dispatch(
  session: Session,
  request: RefactorRequest,
  deps: ProtocolDeps,
): Promise<RefactorResponse> {
  const { id } = request;
  try {
    const result = await handle(session, request, deps);
    return { id, ok: true, result };
  } catch (err) {
    return { id, ok: false, error: formatError(err) };
  }
}

async function handle(
  session: Session,
  request: RefactorRequest,
  deps: ProtocolDeps,
): Promise<unknown> {
  switch (request.op) {
    case "loadProject":
      return session.loadProject(parse(LoadProjectParamsSchema, request.params));
    case "rename":
      return handleRename(session, parse(RenameParamsSchema, request.params), deps);
    case "move": {
      const params = parse(MoveParamsSchema, request.params);
      return session.planMove(params);
    }
    case "moveDir": {
      const params = parse(MoveParamsSchema, request.params);
      return session.planMoveDir(params);
    }
    case "apply":
      return handleApply(session, parse(ApplyParamsSchema, request.params), deps);
    case "status":
      parse(EmptyParamsSchema, request.params ?? {});
      return session.status();
    case "shutdown":
      parse(EmptyParamsSchema, request.params ?? {});
      session.dispose();
      return { shutdown: true };
    default:
      throw new UsageError(`Unknown op: ${request.op}`);
  }
}

function handleRename(
  session: Session,
  params: z.infer<typeof RenameParamsSchema>,
  deps: ProtocolDeps,
): unknown {
  const offset = resolveOffset(params, deps);
  return session.planRename({ filePath: params.filePath, offset, newName: params.to });
}

function resolveOffset(
  params: z.infer<typeof RenameParamsSchema>,
  deps: ProtocolDeps,
): number {
  const hasPosition = params.position !== undefined;
  const hasOffset = params.offset !== undefined;

  if (hasPosition && hasOffset) {
    throw new UsageError("rename accepts exactly one of position or offset, not both");
  }
  if (!hasPosition && !hasOffset) {
    throw new UsageError(
      "rename requires a position (line:col) or offset; a bare symbol name is not enough to disambiguate",
    );
  }

  if (params.offset !== undefined) {
    return params.offset;
  }

  const { line, column } = parsePosition(params.position);
  const text = deps.readFileText(params.filePath);
  return positionToOffset(text, line, column);
}

function parsePosition(
  position: z.infer<typeof PositionParamSchema> | undefined,
): { line: number; column: number } {
  if (position === undefined) {
    throw new UsageError("missing position");
  }
  if (typeof position !== "string") {
    return position;
  }

  const match = /^(\d+):(\d+)$/.exec(position.trim());
  if (match === null) {
    throw new UsageError(`Invalid position "${position}"; expected line:col (e.g. 12:8)`);
  }
  const line = Number(match[1]);
  const column = Number(match[2]);
  if (line < 1 || column < 1) {
    throw new UsageError(`Invalid position "${position}"; line and column are 1-based`);
  }
  return { line, column };
}

async function handleApply(
  session: Session,
  params: z.infer<typeof ApplyParamsSchema>,
  deps: ProtocolDeps,
): Promise<unknown> {
  if (params.plan !== undefined && params.planId !== undefined) {
    throw new UsageError("apply accepts exactly one of plan or planId, not both");
  }
  const target = params.plan ?? params.planId;
  if (target === undefined) {
    throw new UsageError("apply requires an inline plan or a planId");
  }
  return session.apply(target, { allowStale: params.allowStale, warn: deps.warn });
}

function parse<S extends z.ZodTypeAny>(schema: S, params: unknown): z.infer<S> {
  const result = schema.safeParse(params);
  if (!result.success) {
    throw new UsageError(result.error.issues.map((issue) => issue.message).join("; "));
  }
  return result.data;
}

export interface ServeLoopOptions {
  session: Session;
  input: AsyncIterable<string>;
  // Writes a single response line; the caller appends the newline framing.
  writeLine: (line: string) => void;
  readFileText: (filePath: string) => string;
  // Sink for non-response diagnostics (e.g. --allow-stale warnings); must go to
  // stderr so stdout carries only NDJSON responses (R6.2).
  warn?: (msg: string) => void;
}

// Reads one JSON request per line, dispatches serially against the warm session,
// and writes exactly one JSON response per request. Blank lines are skipped.
// Never throws: a malformed line becomes a usage error response and the loop
// continues. Returns when the input ends or a shutdown request is processed.
export async function runServeLoop(options: ServeLoopOptions): Promise<void> {
  const { session, input, writeLine } = options;
  const deps: ProtocolDeps = { readFileText: options.readFileText, warn: options.warn };

  for await (const rawLine of input) {
    const line = rawLine.trim();
    if (line === "") continue;

    const parsed = parseRequestLine(line);
    if (parsed.kind === "error") {
      writeLine(JSON.stringify(parsed.response));
      continue;
    }

    const response = await dispatch(session, parsed.request, deps);
    writeLine(JSON.stringify(response));

    if (parsed.request.op === "shutdown" && response.ok) {
      return;
    }
  }
}

type ParsedLine =
  | { kind: "request"; request: RefactorRequest }
  | { kind: "error"; response: RefactorResponse };

function parseRequestLine(line: string): ParsedLine {
  let parsed: unknown;
  try {
    parsed = JSON.parse(line);
  } catch {
    return malformedLine("request line is not valid JSON");
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return malformedLine("request must be a JSON object");
  }

  const record = parsed as Record<string, unknown>;
  const id = normalizeId(record["id"]);
  if (typeof record["op"] !== "string") {
    return {
      kind: "error",
      response: { id, ok: false, error: { code: "usage", message: "request is missing a string op" } },
    };
  }

  return { kind: "request", request: { id, op: record["op"], params: record["params"] } };
}

// The contract types id as a string; coerce a present number/boolean to its
// string form so a client using numeric ids can still correlate responses,
// rather than silently blanking it. A missing/object id becomes "".
function normalizeId(raw: unknown): string {
  if (typeof raw === "string") return raw;
  if (typeof raw === "number" || typeof raw === "boolean") return String(raw);
  return "";
}

function malformedLine(message: string): ParsedLine {
  return {
    kind: "error",
    response: { id: "", ok: false, error: { code: "usage", message } },
  };
}
