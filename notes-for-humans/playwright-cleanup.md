# Playwright cleanup

Browser cleanup should be owned by the system that owns the agent execution.
An agent closing its browser promptly is useful, but cancellation, crashes,
context rotation, and forgotten cleanup must not leave browsers running forever.

## Manual cleanup

Run `./scripts/orphaned-playwright` from this repository, or use
`orphaned-playwright` after installing utility scripts with `ai install --scope user`.
The script is self-contained and requires Python 3.9+ and Gum. It supports macOS
and Linux; macOS reports native memory footprint as well as RSS in JSON.

Select sessions with Space, press Enter, and choose **Inspect selected** or
**Terminate selected (SIGTERM)**. Termination has a confirmation showing the
number of sessions and processes. The tool signals the roots first, giving
daemons time to close their browsers, then signals any remaining selected
descendants. Each stage waits three seconds by default (`--grace SECONDS`).
Surviving processes require a separate confirmation before SIGKILL. Cancellation
before termination sends no signals; cancellation during shutdown leaves the
already-sent signals in effect and may leave survivors to review on another run.

`--list` and `--json` only report and do not require Gum. `--all` includes
attached and younger processes; otherwise the tool selects detached roots
(parent PID 1) at least two hours old. `--min-age-hours N` changes that threshold.
There is deliberately no unattended kill flag: process age and parentage cannot
establish whether a detached Playwright session is still in use.

The scanner recognizes Node/Bun launches of
`playwright-core/lib/entry/cliDaemon.js` and Chrome/Chromium roots using a
Playwright temporary profile plus the remote-debugging pipe. It groups their
same-user descendants, so each daemon and its browsers appear once. A browser
whose daemon has exited can still appear through its temporary profile marker.
It does not classify ordinary Chrome profiles, arbitrary command lines that
mention Playwright, other users' processes, or its own process ancestry.
Custom-profile browsers without a recognized daemon, detached helpers without
a recognizable browser root, Firefox/WebKit, and other browser launchers may
not be detected. Parent PID 1 is a candidate filter, not an orphan verdict:
Playwright CLI daemons intentionally detach from their launching command.

Before signalling, the tool rechecks the selected root and its process tree.
It refuses changed identities or newly discovered descendants, and verifies
the kernel process start identity and argv again immediately before each signal.
It signals individual PIDs rather than process groups. The OS does not make a
PID identity check followed by `kill` atomic, so a very small race remains.
Only approved process identities are targeted; processes created during cleanup
can require another scan. Browser profiles and socket files are not deleted.
Signal attempts are logged as JSON to stderr; partial failures exit nonzero.

Memory footprint includes compressed allocations and is not a promise of
immediately recoverable RAM. RSS alone can hide most of an idle daemon's retained
memory. Compare swap activity and workload time after cleanup, not only swap used.

Verification: `python3 scripts/orphaned-playwright.test.py` runs selection and
identity checks plus a disposable Node daemon/child termination test. Node is
required for that test, not for running the cleanup script.

## Prevention in agent runners

This is a proposed ownership design; the manual script does not implement runner
lifecycle hooks or install a scheduled cleanup job.

| Layer | Responsibility |
| --- | --- |
| Agent | Use its assigned browser session; close it when inspection is finished. Never reuse another conversation's browser or run a global kill command. |
| Agent runner | Own creation, identity, and teardown. Close resources on execution cancellation or completion and when the owning conversation or session is archived or deleted. |
| Periodic reconciliation | Retry missed teardown and recover after server crashes using the same ownership records and cleanup routine. |

Give each browser a unique, runner-generated identity bound to the project, session,
conversation, and execution generation. Record the daemon PID and kernel start
identity, browser profile/socket, and lifecycle state durably as part of creation.
Route browser startup through a runner-owned launcher so registration is automatic;
an instruction asking the agent to register an arbitrary spawned browser is not
a reliable ownership boundary. Recover incomplete starts by reconciling the
runner-owned profile/socket namespace on startup.

Make browser reuse an explicit lease. The normal default should release browsers
when an agent execution ends; any reuse between turns needs a bounded idle lease.
Archive/delete transitions revoke the owner's leases and prevent concurrent
browser acquisition before dispatching cleanup. A source-code merge alone is
not sufficient if the session remains active. Use the canonical lifecycle
service so API, UI, CLI, workflow, and bulk actions all trigger the same policy.

Cleanup should request the session-specific Playwright close operation first,
then signal verified remaining processes after a grace period. A retryable job
can do this without holding an HTTP request open. Log the owner, resource ID,
reason, PID/start identity, signals, and survivors. An agent process-group kill
alone cannot catch a daemon that detached into a separate process group.

Run reconciliation at runner startup and periodically (for example every five
minutes). Reclaim resources only when their owner is terminal or their reuse
lease expired, rechecking state immediately before teardown. A separate macOS
LaunchAgent could also run this reconciliation. Calling a runner endpoint requires
the server to be up; recovery while it is down needs a shared durable ownership
and lease contract that the external job can verify independently. If ownership
cannot be verified, report candidates instead of killing by age. Unregistered
legacy processes remain a manual-review case, which is what this script handles.
