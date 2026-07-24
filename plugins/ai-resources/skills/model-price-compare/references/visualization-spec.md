# Visualization Specification

HTML page structure, Chart.js configurations, and styling for the model price comparison output.

## Page Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Frontier Model Price Comparison</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
  <style>/* see CSS section below */</style>
</head>
<body>
  <header>
    <h1>Frontier Model Price Comparison</h1>
    <p class="subtitle">Data retrieved: {DATE}</p>
  </header>
  <main>
    <section class="chart-section" id="price-comparison">
      <h2>Input vs Output Price (per 1M tokens)</h2>
      <canvas id="priceChart"></canvas>
    </section>
    <section class="chart-section" id="pages-per-dollar">
      <h2>Pages Per Dollar (1 page ≈ 800 tokens)</h2>
      <canvas id="pagesChart"></canvas>
    </section>
    <section class="chart-section" id="context-window">
      <h2>Context Window</h2>
      <canvas id="contextChart"></canvas>
    </section>
    <section class="chart-section" id="scatter">
      <h2>Price vs Context Window</h2>
      <canvas id="scatterChart"></canvas>
    </section>
    <section class="table-section" id="data-table">
      <h2>Complete Pricing Data</h2>
      <table><!-- see Table section --></table>
    </section>
  </main>
</body>
</html>
```

## CSS Foundation

```css
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f8f9fa;
  color: #1a1a2e;
  line-height: 1.6;
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

header {
  text-align: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #e0e0e0;
}

header h1 {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
}

.subtitle {
  color: #666;
  font-size: 0.95rem;
}

.chart-section, .table-section {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}

.chart-section h2, .table-section h2 {
  font-size: 1.25rem;
  margin-bottom: 1rem;
  color: #333;
}

canvas {
  max-height: 400px;
}

/* Table styles */
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

thead {
  background: #f1f3f5;
}

th, td {
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 1px solid #e9ecef;
}

th {
  font-weight: 600;
  color: #495057;
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 0.05em;
}

tr:hover {
  background: #f8f9fa;
}

/* Provider color indicators in table */
.provider-anthropic { color: #D97757; font-weight: 600; }
.provider-openai    { color: #10A37F; font-weight: 600; }
.provider-google    { color: #4285F4; font-weight: 600; }

/* Responsive */
@media (max-width: 768px) {
  body { padding: 1rem; }
  .chart-section, .table-section { padding: 1rem; }
  table { font-size: 0.8rem; }
  th, td { padding: 0.5rem; }
}
```

## Provider Colors

Use these consistently across all charts:

```javascript
const PROVIDER_COLORS = {
  Anthropic: { bg: 'rgba(217, 119, 87, 0.7)',  border: '#D97757' },
  OpenAI:    { bg: 'rgba(16, 163, 127, 0.7)',   border: '#10A37F' },
  Google:    { bg: 'rgba(66, 133, 244, 0.7)',    border: '#4285F4' },
};
```

Assign each model its provider's color. When showing input vs output side by side, use full opacity for input and 50% opacity for output.

## Chart Configurations

### 1. Input vs Output Price (Grouped Bar)

Grouped bar chart with two bars per model — input price and output price.

```javascript
new Chart(ctx, {
  type: 'bar',
  data: {
    labels: modelNames,   // e.g., ['Claude Sonnet 4.6', 'GPT-4o', ...]
    datasets: [
      {
        label: 'Input (per 1M tokens)',
        data: inputPrices,
        backgroundColor: models.map(m => PROVIDER_COLORS[m.provider].bg),
        borderColor: models.map(m => PROVIDER_COLORS[m.provider].border),
        borderWidth: 1,
      },
      {
        label: 'Output (per 1M tokens)',
        data: outputPrices,
        // Use lighter shade for output
        backgroundColor: models.map(m =>
          PROVIDER_COLORS[m.provider].bg.replace('0.7', '0.4')),
        borderColor: models.map(m => PROVIDER_COLORS[m.provider].border),
        borderWidth: 1,
        borderDash: [5, 5],
      }
    ]
  },
  options: {
    responsive: true,
    plugins: {
      tooltip: {
        callbacks: {
          label: ctx => `${ctx.dataset.label}: $${ctx.parsed.y.toFixed(2)}`
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: { display: true, text: 'USD per 1M tokens' }
      }
    }
  }
});
```

### 2. Pages Per Dollar (Grouped Bar)

Same grouped structure — input pages/dollar and output pages/dollar.

```javascript
new Chart(ctx, {
  type: 'bar',
  data: {
    labels: modelNames,
    datasets: [
      {
        label: 'Pages/$ (Input)',
        data: pagesPerDollarInput,
        backgroundColor: models.map(m => PROVIDER_COLORS[m.provider].bg),
        borderColor: models.map(m => PROVIDER_COLORS[m.provider].border),
        borderWidth: 1,
      },
      {
        label: 'Pages/$ (Output)',
        data: pagesPerDollarOutput,
        backgroundColor: models.map(m =>
          PROVIDER_COLORS[m.provider].bg.replace('0.7', '0.4')),
        borderColor: models.map(m => PROVIDER_COLORS[m.provider].border),
        borderWidth: 1,
      }
    ]
  },
  options: {
    responsive: true,
    scales: {
      y: {
        beginAtZero: true,
        title: { display: true, text: 'Pages per $1 (1 page ≈ 800 tokens)' }
      }
    }
  }
});
```

### 3. Context Window (Horizontal Bar)

Horizontal bar chart sorted by context size descending.

```javascript
// Sort models by context window descending
const sorted = [...models].sort((a, b) => b.contextWindow - a.contextWindow);

new Chart(ctx, {
  type: 'bar',
  data: {
    labels: sorted.map(m => m.model),
    datasets: [{
      label: 'Context Window',
      data: sorted.map(m => m.contextWindow),
      backgroundColor: sorted.map(m => PROVIDER_COLORS[m.provider].bg),
      borderColor: sorted.map(m => PROVIDER_COLORS[m.provider].border),
      borderWidth: 1,
    }]
  },
  options: {
    indexAxis: 'y',   // horizontal
    responsive: true,
    scales: {
      x: {
        beginAtZero: true,
        title: { display: true, text: 'Tokens' },
        ticks: {
          callback: v => v >= 1_000_000
            ? (v / 1_000_000) + 'M'
            : (v / 1_000) + 'K'
        }
      }
    }
  }
});
```

### 4. Price vs Context Scatter

Scatter plot positioning models by value — larger context + lower price = better value (bottom-right).

```javascript
new Chart(ctx, {
  type: 'scatter',
  data: {
    datasets: models.map(m => ({
      label: m.model,
      data: [{ x: m.contextWindow, y: m.outputPrice }],
      backgroundColor: PROVIDER_COLORS[m.provider].bg,
      borderColor: PROVIDER_COLORS[m.provider].border,
      borderWidth: 2,
      pointRadius: 8,
      pointHoverRadius: 10,
    }))
  },
  options: {
    responsive: true,
    scales: {
      x: {
        title: { display: true, text: 'Context Window (tokens)' },
        ticks: {
          callback: v => v >= 1_000_000
            ? (v / 1_000_000) + 'M'
            : (v / 1_000) + 'K'
        }
      },
      y: {
        title: { display: true, text: 'Output Price (USD/1M tokens)' },
        ticks: { callback: v => '$' + v }
      }
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: ctx => {
            const m = models[ctx.datasetIndex];
            return `${m.model}: ${formatTokens(m.contextWindow)} ctx, $${m.outputPrice}/1M out`;
          }
        }
      }
    }
  }
});
```

## Data Table

Table columns in order:

| Column | Content |
|--------|---------|
| Provider | Provider name with color class |
| Model | Model display name |
| Input $/1M | Input price formatted as USD |
| Output $/1M | Output price formatted as USD |
| Context | Context window with K/M suffix |
| Pages/$ (In) | Input pages per dollar, rounded to nearest integer |
| Pages/$ (Out) | Output pages per dollar, rounded to nearest integer |

```html
<table>
  <thead>
    <tr>
      <th>Provider</th>
      <th>Model</th>
      <th>Input $/1M</th>
      <th>Output $/1M</th>
      <th>Context</th>
      <th>Pages/$ (In)</th>
      <th>Pages/$ (Out)</th>
    </tr>
  </thead>
  <tbody>
    <!-- Example row — populate from researched data -->
    <tr>
      <td class="provider-anthropic">Anthropic</td>
      <td>Claude Sonnet 4.6</td>
      <td>$3.00</td>
      <td>$15.00</td>
      <td>200K</td>
      <td>417</td>
      <td>83</td>
    </tr>
    <!-- ... -->
  </tbody>
</table>
```

## Data Structure

Structure pricing data as a JavaScript array for use across all charts:

```javascript
// Placeholder values — always populate from researched pricing data
const models = [
  {
    provider: 'Anthropic',
    model: 'Claude Sonnet 4.6',
    inputPrice: 3.00,      // USD per 1M tokens — use researched value
    outputPrice: 15.00,    // USD per 1M tokens — use researched value
    contextWindow: 200000, // tokens — use researched value
  },
  // ... more models
];

// Derived metrics
models.forEach(m => {
  m.pagesPerDollarInput  = 1_000_000 / m.inputPrice  / 800;
  m.pagesPerDollarOutput = 1_000_000 / m.outputPrice / 800;
});
```

## Formatting Helpers

```javascript
function formatUSD(n) {
  return '$' + n.toFixed(2);
}

function formatTokens(n) {
  if (n >= 1_000_000) return (n / 1_000_000) + 'M';
  return (n / 1_000) + 'K';
}

function formatPages(n) {
  return Math.round(n).toLocaleString();
}
```
