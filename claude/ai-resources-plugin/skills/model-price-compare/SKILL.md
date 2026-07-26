---
name: model-price-compare
description: "Compare AI model prices across Anthropic, OpenAI, and Google. Generates pages-per-dollar / cost-per-token visualizations."
disable-model-invocation: true
---

# Model Price Comparison

Generate an interactive HTML visualization comparing pricing and capabilities of frontier AI models across major providers.

## Target Models

Research the current pricing for these frontier model families:

| Provider | Model | Baseline price (per 1M tokens, as of July 2026) |
|----------|-------|--------------------------------------------------|
| **Anthropic** | Claude Fable 5 (`claude-fable-5`) | $10 input / $50 output |
| **Anthropic** | Claude Opus 5 (`claude-opus-5`) | $5 input / $25 output |
| **Anthropic** | Claude Sonnet 5 (`claude-sonnet-5`) | $3 input / $15 output ($2 / $10 intro through 2026-08-31) |
| **Anthropic** | Claude Haiku 4.5 (`claude-haiku-4-5-20251001`) | $1 input / $5 output |
| **OpenAI** | GPT-5.6 family (Sol, Terra, Luna) | Sol $5 / $30; Terra $2.50 / $15; Luna $1 / $6 |
| **Google** | Latest Gemini models (Gemini 2.5 Pro, Gemini 2.5 Flash, etc.) | verify at research time |

The models listed above are baseline targets as of July 2026, and the baseline prices exist only to sanity-check research results. If newer versions exist, use the current versions. Include additional frontier models discovered during research that belong to these product lines. Exclude deprecated, preview, or fine-tuning-only variants.

## Workflow

### Step 1: Research Current Pricing

<critical>
  Always research live pricing. Prices change frequently — training data is unreliable for pricing.
</critical>

Search for the official API pricing page of each provider. For each model, collect:

| Field | Description |
|-------|-------------|
| `provider` | Anthropic, OpenAI, or Google |
| `model` | Display name (e.g., "Claude Sonnet 5") |
| `inputPrice` | USD per 1M input tokens |
| `outputPrice` | USD per 1M output tokens |
| `contextWindow` | Maximum context window in tokens |

Use standard real-time API pricing. If a provider offers tiered pricing (batch, cached, etc.), use the default non-batch, non-cached tier.

### Step 2: Calculate Derived Metrics

**Pages per dollar** — approximate one page as 800 tokens:

```
pagesPerDollarInput  = 1,000,000 / inputPrice  / 800
pagesPerDollarOutput = 1,000,000 / outputPrice / 800
```

### Step 3: Generate HTML Visualization

Create a self-contained HTML file saved as `model-price-comparison.html` in the current working directory.

Refer to `references/visualization-spec.md` for the complete HTML structure, Chart.js configurations, and styling guidelines.

#### Required Visualizations

1. **Input vs Output Price** — Grouped bar chart with input and output price per 1M tokens side by side for each model
2. **Pages Per Dollar** — Bar chart showing input and output pages per dollar, highlighting cost efficiency
3. **Context Window** — Horizontal bar chart comparing context windows across models
4. **Price vs Context Scatter** — Scatter plot with context window (X) vs output price per 1M tokens (Y), bubble labeled by model name
5. **Comprehensive Data Table** — All raw and derived data in a styled, readable table

#### Provider Color Scheme

Use consistent colors across all charts:

| Provider | Color | Hex |
|----------|-------|-----|
| Anthropic | Coral | `#D97757` |
| OpenAI | Green | `#10A37F` |
| Google | Blue | `#4285F4` |

### Step 4: Present Results

After generating the HTML file:

1. Report the file path
2. Summarize key findings — best value, largest context, cheapest input/output
3. Note the date pricing was retrieved

## Output Requirements

- Self-contained single HTML file — all CSS inline, Chart.js loaded via CDN
- Responsive layout
- Clean, modern design with readable typography
- All prices in USD
- Data retrieval date displayed prominently in the page header

## Additional Resources

### Reference Files

- **`references/visualization-spec.md`** — HTML page structure, Chart.js chart configurations, table styling, and responsive layout patterns
