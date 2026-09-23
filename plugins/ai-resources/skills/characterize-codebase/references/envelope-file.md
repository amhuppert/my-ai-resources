# ENVELOPE.md

`ENVELOPE.md` at the project root states the operating envelope for every agent that works on the code: the conditions the code meets, and the conditions it will never meet, so no mechanism gets added for them. This skill reads it as a stated envelope and writes it, on the user's acceptance, from the operating envelope a report used. Shape:

````markdown
# Operating envelope

<Two or three sentences: who runs this, where, and what a failure costs. The nearest archetype, and how the project departs from it.>

| Dimension | Condition |
|---|---|
| Users | <who invokes it, who operates it, who is affected when it misbehaves> |
| Trust | <which callers and which data can be hostile; hostile data is parsed strictly and never executed, which is separate from handling hostile filesystem layout, see Accepted inputs> |
| Concurrency | <what runs at the same time against the same state> |
| Topology | <processes, machines, and what sits between them> |
| Lifetime | <how long a run lasts; what survives across runs and versions> |
| Failure cost | <what a failure costs, and to whom> |
| Compatibility | <who depends on its interfaces and formats, and for how long> |
| Scale | <how much data, how many requests> |

## Outside the envelope

<Conditions this code will not meet, one per line, so no mechanism is added for them: concurrent invocations; hostile callers; a second machine; consumers of its API.>

## Accepted inputs

<What the tool refuses with a plain error rather than handles, one per line: symlinks inside selected trees; special files; names that collide under the destination's case or normalization rules; any filesystem error other than "not found". A refused input is not a condition the design handles, so no mechanism is added to classify or recover from it.>

## Recovery

<What a failed run costs and what recovery is. For regenerable output this is one line: rerun; no partial-progress state is classified or reported. Name the data that is not regenerable (unrelated settings the tool must preserve) and the one mechanism it earns.>

## First version

<The smallest slice that carries the representative situation from entry to result, and the capabilities deferred past it, one per line with what each adds. The first version is the appetite unless the user states a larger one.>
````

Fill every row. A row the user has not confirmed carries the inference and the word "assumed". Keep the file under a page; the table and the lists are what agents read. The three lists after the table are where a first version gets smaller: the dimension table constrains mechanisms for conditions, and in one audited project it did that well and still left breadth and hardening tier unstated, which is where the complexity went.
