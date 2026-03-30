---
name: model-price-compare
description: This skill should be used when the user asks to "compare model prices", "show model pricing", "generate a price comparison", "compare AI model costs", "model price chart", "compare frontier model prices", "pages per dollar", "cost per token comparison", "model pricing visualization", or mentions comparing pricing across AI providers like Anthropic, OpenAI, and Google.
---

# Model Price Comparison

Generate an interactive HTML visualization comparing pricing and capabilities of frontier AI models across major providers. Always research live pricing data — never rely on training knowledge.

## Target Models

Research the current pricing for these frontier model families:

| Provider | Models |
|----------|--------|
| **Anthropic** | Claude Opus 4.6, Claude Sonnet 4.6, Claude Haiku 4.5 |
| **OpenAI** | GPT-5.4 family (GPT-5.4, GPT-5.4-mini, GPT-5.4-nano) |
| **Google** | Latest Gemini models (Gemini 2.5 Pro, Gemini 2.5 Flash, etc.) |

The models listed above are baseline targets. If newer versions exist (e.g., a model listed as 4.6 is now 5.0), use the current versions. Include additional frontier models discovered during research that belong to these product lines. Exclude deprecated, preview, or fine-tuning-only variants.

## Workflow

### Step 1: Research Current Pricing

<critical>
  Always research live pricing. Prices change frequently — training data is unreliable for pricing.
</critical>

Search for the official API pricing page of each provider. For each model, collect:

| Field | Description |
|-------|-------------|
| `provider` | Anthropic, OpenAI, or Google |
| `model` | Display name (e.g., "Claude Sonnet 4.6") |
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
