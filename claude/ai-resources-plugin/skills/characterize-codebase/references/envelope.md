# Envelope reference

Vocabulary for the characterize-codebase skill: the values each dimension takes, the archetypes, and the mechanism catalog.

## Dimension values

Each dimension's conditions, in rough order of demand. Demand is not quality: a wider envelope is a different job, not a better one.

- **Users**: the author alone → the author's agents and scripts calling on the author's behalf → a few trusted colleagues → other developers through an API → many strangers. Operators: the author at a terminal → a teammate reading logs → an on-call rotation far from the process.
- **Trust**: callers and data trusted → callers trusted, external data hostile → callers hostile.
- **Concurrency**: one invocation at a time → several invocations of the same tool → concurrent requests on shared state → concurrent writers across nodes.
- **Topology**: one process → child processes on one machine → a few processes and a database over a network → many services on many machines, failing independently.
- **Lifetime**: seconds, nothing survives → durable local state across runs → an always-on process restarted under load → data that outlives every code version.
- **Failure cost**: rerun it → the author's time or data → a team's time → other people's data → money or safety.
- **Compatibility**: nothing depends on it → the author's other scripts and its own on-disk state → colleagues' workflows and a shared schema → external consumers on versions the author cannot update.
- **Scale**: fits in memory → one person's data → one database → beyond one machine.

## Archetypes

Named regions of envelope space. Landmarks, not bins: a codebase can sit between two, and the dimension profile is the real answer. Name the nearest one and say how the code departs from it.

### Throwaway

Run once or a few times by its author to get an answer, then discarded.

- **Envelope**: author only; trusted input; one process; nothing survives the run; failure costs a rerun; nothing depends on it.
- **Real problems**: the right output, this once.
- **Outside the envelope**: everything else, including tests, structure, and error handling beyond crashing with a stack trace.
- **Signs**: single file, hardcoded paths, no tests, output pasted elsewhere.
- **Trap**: a throwaway that is still being run is a single-operator tool written as a throwaway. The finding is underbuilt, not overbuilt.

### Single-operator tool

A CLI, script, TUI, or local app the author runs on their own machine, possibly for years and possibly large.

- **Envelope**: the author is the user, the operator, and the only reader of error messages, sometimes through an agent acting for them; callers trusted, ingested external data hostile; one invocation at a time; one process (plus child processes) on one machine; durable local state in files or SQLite; failure costs the author's time and the author's own data; the author's other scripts and the tool's own on-disk state depend on it; one person's data volume.
- **Real problems**: correctness; maintainability in full; atomic writes to its own state; errors that tell the author what to do; configuration; strict parsing of whatever it fetches or imports; machine-readable output when an agent drives it.
- **Outside the envelope**: auth and sessions; rate limiting; concurrent writers; distributed coordination; retries and circuit breakers around local calls; health endpoints, metrics, tracing; API versioning; feature flags; pluggable backends with one implementation; multi-tenancy; i18n; horizontal scaling.
- **Daemon variant**: a long-running local process adds lifetime conditions (memory growth, signal handling and restart, log rotation) and concurrency between the events it handles. Nothing else widens.
- **Signs**: installed to PATH or run from a checkout; state under a dotfile directory; one git author; README addressed to the author.

### Team-internal tool or service

Used by a handful of trusted colleagues, on a shared box, a small deployment, or each person's machine.

- **Envelope**: a few trusted people who are not the author; callers trusted, data not necessarily; a few concurrent users; one process or a small deployment with a shared database; long-lived shared state; failure costs a team's time; colleagues' workflows and the shared schema depend on it; team-sized volume.
- **Real problems**: everything a single-operator tool needs, plus setup docs for others, config validation with clear errors, schema migrations, concurrency control on shared state, logs a colleague can diagnose from, backups of shared state.
- **Outside the envelope**: hostile callers; rate limiting; horizontal scale; multi-region; consensus; public API stability; feature flags.
- **Signs**: internal docs, a shared database URL, a few git authors, deployed to one host.

### Library or SDK

Code consumed by other code the author does not control.

- **Envelope**: users are other developers, through the API; caller input can be wrong, and is hostile only when handling untrusted data is the library's job; concurrency is whatever the caller does; runs inside the caller's process; versions stay in the wild for years; a bug reaches every consumer; compatibility is the dominant dimension; scale is the caller's.
- **Real problems**: API stability, semver, deprecation paths, no global mutable state, documented behavior, validation at the API boundary, few dependencies.
- **Outside the envelope**: deployment, operability, persistence, auth, config files, logging frameworks, retries.
- **Signs**: published package, public type exports, changelog, semver tags, no entrypoint that runs anything.

### Multi-user service, small

A networked application serving hundreds to thousands of people who do not trust each other, on one deployment with one database.

- **Envelope**: many untrusted users; every request hostile until authenticated and validated; concurrent requests and writers; a few processes, a database, maybe a cache, over a network; always on, deployed repeatedly, data outliving every code version; failure costs other people's data and time; API clients and the schema depend on it; one database handles the volume.
- **Real problems**: authentication and authorization; input validation and output encoding; transactions and concurrency control; migrations; backups; graceful deploys; observability read by someone else; timeouts on outbound calls; secrets management.
- **Outside the envelope**: consensus; multi-region; sharding; exactly-once delivery across services; service mesh; event sourcing for scale.
- **Signs**: deployment manifests, a hosted database, auth tables, a public URL.

### Multi-user service, large

Many replicas, many services, many teams, millions of users.

- **Envelope**: topology and scale dominate; partial failure between services is normal.
- **Real problems**: everything the small service needs, plus idempotency, retries with backoff, circuit breakers, backpressure, rate limiting, caching, queues, tracing, feature flags, gradual rollouts, horizontal scaling.
- **Outside the envelope**: little. The usual mismatch runs the other way: a service in this envelope built like a small one.

### Distributed system

Correctness itself depends on coordination across nodes that fail independently: databases, queues, consensus, replication, schedulers. A large service *uses* distributed systems; this archetype *is* one.

- **Envelope**: many nodes; unreliable network; independent failure; concurrency is fundamental; durability is the product; failure means data loss or split brain; wire protocols and on-disk formats must survive version skew.
- **Real problems**: partial failure, ordering, consensus, leases, membership, clock skew, durability guarantees, protocol and format compatibility across versions.
- **Outside the envelope**: user-facing concerns belong to whatever sits on top: auth, UI, sessions.

### Batch or data pipeline

Scheduled or triggered jobs that transform large data unattended.

- **Envelope**: operators through a scheduler; parallel workers on partitions; hours per run, durable outputs; failure costs a rerun or a corrupted downstream dataset; downstream consumers depend on output schemas; large volume.
- **Real problems**: idempotent reruns, checkpointing and partial progress, backfills, schema evolution of inputs, resource limits, failure alerting.
- **Outside the envelope**: interactive latency, sessions, per-request auth, UI.

## Mechanism catalog

Mechanisms grouped by dimension, each with the condition it presumes. A sighting puts the condition in the design envelope. The condition absent from the operating envelope makes the mechanism overbuilt; the condition present in the operating envelope with no mechanism makes the code underbuilt.

### Users

- **Login, sessions, tokens, API keys, roles and permissions**: callers who are not one trusted person.
- **Tenant IDs on rows, per-tenant config, tenant isolation**: many independent user groups.
- **Setup wizards, elaborate help, friendly argument validation, i18n**: users who are not the author.
- **Machine-readable output, exit-code taxonomy, stdout and stderr discipline, line-delimited protocols**: a program or agent calling on the author's behalf. Fit whenever the author drives the tool through an agent.
- **Health and readiness endpoints, metrics exporters, tracing, structured logs with configurable levels**: an operator diagnosing the process from outside it, usually elsewhere.
- **Admin interfaces**: operators distinct from users.

### Trust

- **Input sanitization, output encoding, CSRF and CSP, rate limiting, request size limits**: hostile callers.
- **Strict parsers, sandboxing, resource limits on parsing external files**: hostile data. Fit in nearly every envelope that ingests outside data.
- **Secrets managers, KMS, secrets injected by the platform**: the code runs somewhere the author does not control, or holds other people's secrets.

### Concurrency

- **Transactions, optimistic locking, row versions, SELECT FOR UPDATE, unique constraints as guards**: concurrent writers.
- **Mutexes, file locks, PID files around a resource**: concurrent invocations of the same tool.
- **Idempotency keys, deduplication tables**: the same request can arrive twice.
- **Content hashes or fingerprints checked before a later step**: something else may write between two steps of one caller.
- **Connection pools, worker pools, semaphores**: sustained concurrent load.
- **Queues with workers, background job frameworks**: work that outlives a request or exceeds one process.

### Topology

- **Retries with backoff and jitter, circuit breakers, timeouts, bulkheads**: calls cross a network that fails independently. Around local file I/O or in-process calls, the condition cannot occur; between processes on one machine that restart independently, it can.
- **Service discovery, load balancer config, client-side routing**: multiple instances.
- **Distributed locks, leader election, leases, heartbeats, gossip**: multiple nodes contending or coordinating.
- **Message brokers, event buses, outbox and inbox tables, sagas**: multiple services with independent failure.
- **Serialization contracts between components (protobuf, versioned schemas)**: components deployed independently.
- **Containers, orchestration manifests, infrastructure as code**: environments beyond the author's machine.
- **Configuration layered from environment variables**: the same code in several environments.
- **Platform branches (macOS, Linux, Windows backends), portable path handling**: more than one operating system among the machines it runs on.

### Lifetime

- **Schema migration frameworks, data format versioning**: data that outlives code versions.
- **Graceful shutdown, signal handling, connection draining**: a long-running process restarted while working.
- **Memory bounds, cache eviction, log rotation**: a process that runs long enough to grow.
- **Atomic writes (temp file and rename), fsync, journaling**: a crash mid-write costs something. Fit for a single-operator tool's own state.
- **Checkpoints, resumable runs**: runs long enough that restarting from zero hurts.
- **Signal relay and exit-status forwarding in a wrapper**: the wrapper must be transparent to the terminal and the parent process.

### Failure cost

- **Backups, point-in-time recovery, soft deletes, audit logs**: losing data harms someone or must be explained.
- **Alerting, paging hooks, SLOs**: a failure must be noticed by someone not watching the terminal.
- **Recovery paths for internal invariant violations, rather than assert and crash**: failure must be survived, not just reported.
- **PID re-verification before signaling, staged termination, refusing to run as root**: acting on the wrong process costs the author.
- **Confirmation prompts and dirty-state checks before destructive actions**: an irreversible step the caller may not intend.

### Compatibility

- **API versioning, deprecation warnings, compatibility shims**: consumers the author cannot update.
- **Pluggable backends, adapter and repository interfaces, DI containers, strategy hierarchies with a single implementation**: an expected swap that has not happened. Speculative until a second implementation exists or the user says one is planned. An interface with one production implementation and a test double is a test seam, not a swap; it is a finding only when it costs more than a thin interface (a container, a registry, a plugin loader).
- **Schemas for files another program also writes (an editor's settings file, a shared config)**: a format that evolves on someone else's schedule. Strict parsing drops or rejects what the other program adds.
- **Feature flags, gradual rollout**: users who cannot all receive a change at once.
- **Semver discipline, changelog, public type exports**: external code depends on the interface.
- **Config file schema versions and upgraders**: users' config files outlive releases.
- **Zero-dependency scripts, vendored helpers**: code that runs inside projects it does not control.

### Scale

- **Pagination, streaming, chunked processing, cursors**: data too large to hold at once.
- **Caches with eviction, CDN config**: request rate or latency the origin cannot meet.
- **Indexes, query tuning, denormalization**: tables large enough to matter.
- **Stateless handlers with external session stores, sharding keys**: more than one instance.
- **Batching, bulk endpoints, async offloading**: throughput beyond one request at a time.
