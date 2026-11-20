---
name: compare-reports
description: Judge two AI-generated reports written from the same prompt across
  five dimensions and produce a self-contained HTML comparison declaring a
  winner.
---

# Compare reports

Act as an impartial judge of two reports written by different AI agents for the same prompt. Deliver a single self-contained HTML file that shows which report won, by how much, and why. Readers use this to pick an agent, model, or prompt variant, so the verdict needs to hold up under scrutiny.

## Inputs

You need three inputs: the original prompt, Report A, and Report B (as files or pasted text). If the original prompt is missing, ask for it before judging. You cannot score prompt adherence or usefulness without knowing what was asked. Assign A and B in the order the user supplied them.

## Judging

Read both reports in full before scoring either one. Score each report from 1 to 5 on five dimensions:

| Dimension | 1 (poor) | 3 (adequate) | 5 (excellent) |
| --- | --- | --- | --- |
| Accuracy | Material factual errors or fabrications | Mostly correct with minor slips | Verifiably correct, internally consistent, claims properly hedged |
| Prompt adherence | Ignores core asks | Covers most asks, misses some | Addresses every ask and the intent behind it |
| Organization | No clear structure | Logical but uneven | Structure actively aids comprehension |
| Readability | Confusing, bloated, or fragmentary | Clear with rough patches | Clear, concise, easy to follow |
| Usefulness | Reader cannot act on it | Helpful but leaves gaps | Directly serves what the reader actually needs |

Apply these four rules ahead of the rubric anchors:

1. **Intent over literalism.** Balance literal compliance against the user's real goal. A report that solves the underlying need beats one that ticks boxes while missing the point. Account for ambiguity or gaps in the original prompt.
2. **Check what is checkable.** Test arithmetic, internal consistency, and contradictions between sections. Where a claim cannot be verified, judge whether it is appropriately hedged instead of guessing whether it is true.
3. **Counter judge bias.** Longer is not better, confident is not more accurate, and polish is not substance. Do not favor position (A vs. B) or prose that resembles your own style.
4. **Reason before scoring.** Write the justification for each dimension first, then assign the number. If the reasoning does not match the score, fix the score.

Compute each report's overall grade as the mean of its five scores, rounded to one decimal. Always declare one winner: the higher overall grade, breaking ties by which report better serves the user's underlying need.

Beyond the scores, explain the key differences, points of agreement, each report's distinct approach, and strengths or weaknesses unique to each.

## Output

Build the HTML from `assets/report-comparison-template.html` (relative to this skill). Replace every `{{PLACEHOLDER}}` token with your evaluation; comment markers in the template show which blocks repeat per dimension. Keep the existing CSS and layout intact so the file stays offline and self-contained. Extra caveats (such as prompt ambiguity) belong inside the comparison section, not in new page chrome.

Set each score bar's width to `score / 5 * 100`% so the bars match the numbers. Save to `report-comparison-<short-topic-slug>.html` in the current directory unless the user specifies a path.

Done when every `{{PLACEHOLDER}}` token is replaced, all score bars match their numeric scores, and the HTML file is written. Reply briefly in chat leading with the winner, both overall grades, one sentence on the deciding factor, and the file path. Do not repeat the full analysis in chat.
