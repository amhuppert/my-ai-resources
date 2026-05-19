import React, { useMemo, useState } from "react";
import { Box, render, Text, useApp, useInput } from "ink";
import { execSync } from "node:child_process";
import { readlinkSync } from "node:fs";
import { platform } from "node:os";

type Listener = {
  pid: number;
  port: number;
  cwd: string;
  command: string;
};

type SortKey = "pid" | "port" | "cwd" | "command";

function runCmd(cmd: string): string {
  try {
    return execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return "";
  }
}

function parseLinuxListeners(output: string): Array<{ pid: number; port: number }> {
  const results: Array<{ pid: number; port: number }> = [];
  for (const line of output.split("\n")) {
    if (!line.trim()) continue;
    const fields = line.split(/\s+/);
    const localAddr = fields[3];
    if (!localAddr) continue;
    const portStr = localAddr.split(":").pop();
    const port = Number(portStr);
    if (!Number.isFinite(port)) continue;
    for (const match of line.matchAll(/pid=(\d+)/g)) {
      const pidStr = match[1];
      if (!pidStr) continue;
      const pid = Number(pidStr);
      if (Number.isFinite(pid)) results.push({ pid, port });
    }
  }
  return results;
}

function parseMacosListeners(output: string): Array<{ pid: number; port: number }> {
  const results: Array<{ pid: number; port: number }> = [];
  let currentPid: number | null = null;
  for (const line of output.split("\n")) {
    if (line.startsWith("p")) {
      const pid = Number(line.slice(1));
      currentPid = Number.isFinite(pid) ? pid : null;
    } else if (line.startsWith("n") && currentPid !== null) {
      const addr = line.slice(1).split(" ")[0] ?? "";
      const portStr = addr.split(":").pop();
      const port = Number(portStr);
      if (Number.isFinite(port)) results.push({ pid: currentPid, port });
    }
  }
  return results;
}

function getLinuxCwd(pid: number): string {
  try {
    return readlinkSync(`/proc/${pid}/cwd`);
  } catch {
    return "(unavailable)";
  }
}

function getMacosCwd(pid: number): string {
  const out = runCmd(`lsof -a -p ${pid} -d cwd -Fn`);
  for (const line of out.split("\n")) {
    if (line.startsWith("n")) return line.slice(1);
  }
  return "(unavailable)";
}

function getCommand(pid: number): string {
  const out = runCmd(`ps -ww -p ${pid} -o command=`).trim();
  return out || "(unavailable)";
}

function collectListeners(): Listener[] {
  const os = platform();
  let raw: Array<{ pid: number; port: number }>;
  let cwdFn: (pid: number) => string;

  if (os === "linux") {
    if (!runCmd("command -v ss")) {
      throw new Error("ss (iproute2) is required on Linux but not installed");
    }
    raw = parseLinuxListeners(runCmd("ss -Hltnp"));
    cwdFn = getLinuxCwd;
  } else if (os === "darwin") {
    if (!runCmd("command -v lsof")) {
      throw new Error("lsof is required on macOS but not installed");
    }
    raw = parseMacosListeners(runCmd("lsof -nP -iTCP -sTCP:LISTEN -F pn"));
    cwdFn = getMacosCwd;
  } else {
    throw new Error(`Unsupported platform: ${os}`);
  }

  const seen = new Set<string>();
  const cmdCache = new Map<number, string>();
  const cwdCache = new Map<number, string>();
  const rows: Listener[] = [];

  for (const { pid, port } of raw) {
    const key = `${pid}:${port}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (!cmdCache.has(pid)) cmdCache.set(pid, getCommand(pid));
    if (!cwdCache.has(pid)) cwdCache.set(pid, cwdFn(pid));
    rows.push({
      pid,
      port,
      cwd: cwdCache.get(pid) ?? "(unavailable)",
      command: cmdCache.get(pid) ?? "(unavailable)",
    });
  }
  return rows;
}

function sortRows(rows: Listener[], key: SortKey, asc: boolean): Listener[] {
  const sorted = [...rows].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (typeof av === "number" && typeof bv === "number") return av - bv;
    return String(av).localeCompare(String(bv));
  });
  return asc ? sorted : sorted.reverse();
}

type ColumnSpec = {
  header: string;
  get: (r: Listener) => string;
  align: "left" | "right";
  color?: string;
  flex?: number;
};

const COLUMNS: ColumnSpec[] = [
  { header: "PID", get: (r) => String(r.pid), align: "right" },
  { header: "PORT", get: (r) => String(r.port), align: "right", color: "green" },
  { header: "CWD", get: (r) => r.cwd, align: "left", color: "blue", flex: 1 },
  { header: "COMMAND", get: (r) => r.command, align: "left", flex: 1 },
];

const GAP = 2;

const TableRow = ({
  cells,
  fixedWidths,
  isHeader,
}: {
  cells: string[];
  fixedWidths: number[];
  isHeader?: boolean;
}) => {
  const lastIdx = cells.length - 1;
  return (
    <Box flexDirection="row">
      {cells.map((value, i) => {
        const col = COLUMNS[i];
        if (!col) return null;
        const marginRight = i === lastIdx ? 0 : GAP;
        const color = isHeader ? "cyan" : col.color;

        if (col.flex === undefined) {
          const width = fixedWidths[i] ?? value.length;
          const padded =
            col.align === "right" ? value.padStart(width) : value.padEnd(width);
          return (
            <Box key={i} flexShrink={0} marginRight={marginRight}>
              <Text bold={isHeader} color={color}>
                {padded}
              </Text>
            </Box>
          );
        }

        return (
          <Box
            key={i}
            flexGrow={col.flex}
            flexBasis={0}
            flexShrink={1}
            marginRight={marginRight}
          >
            <Text bold={isHeader} color={color} wrap="wrap">
              {value}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
};

const ServerTable = ({ rows }: { rows: Listener[] }) => {
  const fixedWidths = COLUMNS.map((col, i) => {
    if (col.flex !== undefined) return 0;
    return Math.max(col.header.length, ...rows.map((r) => col.get(r).length));
  });

  return (
    <Box flexDirection="column">
      <TableRow
        cells={COLUMNS.map((c) => c.header)}
        fixedWidths={fixedWidths}
        isHeader
      />
      {rows.map((row, idx) => (
        <TableRow
          key={idx}
          cells={COLUMNS.map((c) => c.get(row))}
          fixedWidths={fixedWidths}
        />
      ))}
    </Box>
  );
};

const App = ({ initialRows }: { initialRows: Listener[] }) => {
  const { exit } = useApp();
  const [sortKey, setSortKey] = useState<SortKey>("pid");
  const [asc, setAsc] = useState(true);
  const [rows, setRows] = useState<Listener[]>(initialRows);
  const [refreshedAt, setRefreshedAt] = useState<string>("");

  const toggleOrSet = (key: SortKey) => {
    if (key === sortKey) {
      setAsc(!asc);
    } else {
      setSortKey(key);
      setAsc(true);
    }
  };

  useInput((input, key) => {
    if (input === "q" || key.escape || (key.ctrl && input === "c")) {
      exit();
      return;
    }
    if (input === "p") toggleOrSet("pid");
    if (input === "o") toggleOrSet("port");
    if (input === "c") toggleOrSet("cwd");
    if (input === "m") toggleOrSet("command");
    if (input === "r") {
      setRows(collectListeners());
      setRefreshedAt(new Date().toLocaleTimeString());
    }
  });

  const sorted = useMemo(() => sortRows(rows, sortKey, asc), [rows, sortKey, asc]);

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="cyan">TCP listeners</Text>
        <Text> — sorted by </Text>
        <Text bold color="yellow">{sortKey}</Text>
        <Text> ({asc ? "asc" : "desc"})</Text>
        {refreshedAt ? <Text dimColor> · refreshed {refreshedAt}</Text> : null}
      </Box>
      {sorted.length === 0 ? (
        <Text dimColor>No TCP servers found.</Text>
      ) : (
        <ServerTable rows={sorted} />
      )}
      <Box marginTop={1}>
        <Text dimColor>Sort: </Text>
        <Text color="yellow">p</Text><Text dimColor>id </Text>
        <Text color="yellow">o</Text><Text dimColor>=port </Text>
        <Text color="yellow">c</Text><Text dimColor>=cwd </Text>
        <Text color="yellow">m</Text><Text dimColor>=command </Text>
        <Text dimColor>· </Text>
        <Text color="yellow">r</Text><Text dimColor>=refresh </Text>
        <Text color="yellow">q</Text><Text dimColor>=quit</Text>
      </Box>
    </Box>
  );
};

function printPlainTable(rows: Listener[]): void {
  if (rows.length === 0) {
    console.log("No TCP servers found.");
    return;
  }
  const headers = COLUMNS.map((c) => c.header);
  const cells = rows.map((r) => COLUMNS.map((c) => c.get(r)));
  const widths = COLUMNS.map((c, i) =>
    Math.max(c.header.length, ...cells.map((row) => row[i]?.length ?? 0)),
  );
  const fmt = (cols: string[]) =>
    cols
      .map((value, i) => {
        const width = widths[i] ?? 0;
        const align = COLUMNS[i]?.align ?? "left";
        return align === "right" ? value.padStart(width) : value.padEnd(width);
      })
      .join(" ".repeat(GAP))
      .trimEnd();
  console.log(fmt(headers));
  for (const row of cells) {
    console.log(fmt(row));
  }
}

function showHelp(): void {
  console.log(`Usage: list-servers [--help]

Description:
    List TCP servers (processes listening on TCP ports) on this machine.
    Shows PID, port, working directory, and full command line.
    Works on Linux (via ss) and macOS (via lsof).

    Interactive when run in a terminal:
      p       sort by PID (toggle asc/desc)
      o       sort by PORT
      c       sort by CWD
      m       sort by COMMAND
      r       refresh
      q/Esc   quit

    When piped or redirected, prints a plain table once and exits.
`);
}

function main(): void {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    showHelp();
    return;
  }
  if (args.length > 0) {
    console.error(`Error: Unknown argument '${args[0]}'`);
    console.error("Use --help for usage information");
    process.exit(1);
  }

  const rows = collectListeners();
  const interactive = Boolean(process.stdout.isTTY && process.stdin.isTTY);

  if (interactive) {
    render(<App initialRows={rows} />);
  } else {
    printPlainTable(rows);
  }
}

try {
  main();
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`Error: ${msg}`);
  process.exit(1);
}
