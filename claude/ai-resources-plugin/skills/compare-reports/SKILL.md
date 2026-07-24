---
name: compare-reports
description: "Compare two reports written by different AI agents from the same prompt — score both across accuracy, prompt adherence, organization, readability, and usefulness, then produce a polished self-contained HTML comparison report that declares a winner. Use whenever the user wants to compare, judge, grade, rank, or pick between two AI-generated reports, answers, research outputs, or documents (\"which of these is better?\", \"evaluate these two responses\", \"A/B test these reports\", \"grade these two drafts\"), even if they don't mention HTML, scoring, or the word \"report\"."
---

# Compare Reports

Act as an impartial judge of two reports produced by different AI agents responding to the same prompt. The deliverable is a single self-contained HTML file that a reader can open in a browser and immediately see which report won, by how much, and why. The reader typically uses this to decide which agent, model, or prompt variant to keep using — so the verdict must be defensible, not just decorated.

## Inputs

Three pieces are needed: the original prompt, Report A, and Report B (as files or pasted text). If the original prompt is missing, ask for it before judging — "adherence to the prompt" and "usefulness" cannot be scored without knowing what was asked. Which report is "A" vs "B" follows the order the user provided them.

## How to judge

Read both reports in full before scoring either. Score each report on five dimensions, 1–5:

| Dimension | 1 (poor) | 3 (adequate) | 5 (excellent) |
|---|---|---|---|
| **Accuracy** | Material factual errors or fabrications | Mostly correct; minor slips | Verifiably correct, internally consistent, claims appropriately hedged |
| **Adherence to the prompt** | Ignores core asks | Covers most asks, misses some | Addresses every ask and the intent behind them |
| **Organization** | No discernible structure | Logical but uneven | Structure actively aids comprehension |
| **Readability** | Confusing, bloated, or fragmentary | Clear with rough patches | Clear, concise, effortless to follow |
| **Usefulness** | Reader can't act on it | Helpful but leaves gaps | Directly serves what the reader actually needs |

Judging principles — these matter more than the rubric anchors:

- **Intent over literalism.** For adherence and usefulness, balance literal instruction-following against the user's underlying need. A report that understands what the user actually needs beats one that rigidly follows instructions while missing the point. The prompt itself may be unclear or incomplete — account for that.
- **Verify what's checkable.** Test factual claims for internal consistency, check any arithmetic, and flag contradictions between sections. Where a claim can't be verified, judge whether it's appropriately hedged rather than assuming it's true or false.
- **Guard against judge biases.** Longer is not better, confident is not more accurate, and polish is not substance. Don't favor a report because of its position (A vs B) or because its style resembles your own.
- **Reasoning before score.** For every dimension, write the reasoning first, then the score. If the reasoning doesn't support the number, fix the number.

The overall grade for each report is the mean of its five scores, rounded to one decimal. Always declare exactly one winner: the higher overall grade, with ties broken by which report better serves the user's underlying need.

Beyond the scores, characterize the reports: key differences, where they overlap or agree, the distinct approach each takes, and strengths and weaknesses unique to each.

## Output

Produce the HTML file from `assets/report-comparison-template.html` (relative to this skill). Read the template and replace its `{{PLACEHOLDER}}` tokens with your evaluation; the comment markers show which blocks repeat per dimension. Keep the design as-is — it is self-contained (embedded CSS, system fonts, no external resources) so the file works offline and can be shared as-is. Content beyond the template's slots (e.g., an extra caveat about the prompt's ambiguity) belongs in the comparison section, not in new page chrome.

Set each score bar's width to `score / 5 * 100`% so the bars visually match the numbers.

Save the file as `report-comparison-<short-topic-slug>.html` in the current directory unless the user names a path.

After writing the file, keep the chat message brief and lead with the outcome: the winner, both overall grades, one sentence on the deciding factor, and the file path. The full analysis lives in the HTML — don't duplicate it in chat.
