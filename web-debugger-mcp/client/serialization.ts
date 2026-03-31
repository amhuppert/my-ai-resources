// Tracks the current recursion stack (ancestors) to detect true cycles,
// not a global visited set which would false-positive on shared references.
export function serialize(value: unknown, ancestors: WeakSet<object> = new WeakSet()): unknown {
  if (value === null) return null;

  if (typeof value === "bigint") {
    return { __type: "BigInt", value: value.toString() };
  }

  if (typeof value === "undefined") {
    return { __type: "undefined" };
  }

  if (typeof value === "function") {
    return { __type: "Function", name: value.name };
  }

  if (typeof value !== "object") {
    return value;
  }

  if (ancestors.has(value)) {
    return { __type: "circular" };
  }

  ancestors.add(value);

  let result: unknown;

  if (value instanceof Set) {
    result = { __type: "Set", values: [...value].map((v) => serialize(v, ancestors)) };
  } else if (value instanceof Map) {
    result = {
      __type: "Map",
      entries: [...value].map(([k, v]) => [serialize(k, ancestors), serialize(v, ancestors)]),
    };
  } else if (value instanceof Date) {
    result = { __type: "Date", value: value.toISOString() };
  } else if (value instanceof RegExp) {
    result = { __type: "RegExp", source: value.source, flags: value.flags };
  } else if (value instanceof Error) {
    result = {
      __type: "Error",
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  } else if (Array.isArray(value)) {
    result = value.map((v) => serialize(v, ancestors));
  } else {
    const obj: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>)) {
      obj[key] = serialize((value as Record<string, unknown>)[key], ancestors);
    }
    result = obj;
  }

  ancestors.delete(value);
  return result;
}
