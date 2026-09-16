# ENVELOPE.md

`ENVELOPE.md` at the project root states the operating envelope for every agent that works on the code: the conditions the code meets, and the conditions it will never meet, so no mechanism gets added for them. This skill reads it as a stated envelope and writes it, on the user's acceptance, from the operating envelope a report used. Shape:

````markdown
# Operating envelope

<Two or three sentences: who runs this, where, and what a failure costs. The nearest archetype, and how the project departs from it.>

| Dimension | Condition |
|---|---|
| Users | <who invokes it, who operates it, who is affected when it misbehaves> |
| Trust | <which callers and which data can be hostile> |
| Concurrency | <what runs at the same time against the same state> |
| Topology | <processes, machines, and what sits between them> |
| Lifetime | <how long a run lasts; what survives across runs and versions> |
| Failure cost | <what a failure costs, and to whom> |
| Compatibility | <who depends on its interfaces and formats, and for how long> |
| Scale | <how much data, how many requests> |

## Outside the envelope

<Conditions this code will not meet, one per line, so no mechanism is added for them: concurrent invocations; hostile callers; a second machine; consumers of its API.>
````

Fill every row. A row the user has not confirmed carries the inference and the word "assumed". Keep the file under a page; the table and the outside list are what agents read.
