// components/PlotlySpark.jsx
// Minimal Plotly wrapper for tiny "spark" charts (bar or line) with a red cutoff.
// Usage: <PlotlySpark kind="bar" values={[...]} cutoffIndex={k} labels={[...]}/>

function PlotlySpark({
  values,
  cutoffIndex,
  labels,
  kind = 'line',
  height = 100,
  currency = false
}) {
  const elRef = React.useRef(null);
  const { formatCurrency } = (window.utils || {});

  React.useEffect(() => {
    if (!elRef.current || !window.Plotly) return;

    const n = Array.isArray(values) ? values.length : 0;
    const x = (labels && labels.length === n)
      ? labels
      : Array.from({ length: n }, (_, i) => `Q${i + 1}`);

    // Split into observed (≤ cutoff) vs future (> cutoff)
    // For lines, include cutoffIndex in both traces to avoid gaps
    const yObs = values.map((v, i) => (i <= cutoffIndex ? v : null));
    const yFut = values.map((v, i) => (i >= cutoffIndex ? v : null));

    const mkHover = (v, i) => {
      const label = x[i];
      if (v == null) return `${label}: —`;
      const val = (currency && formatCurrency)
        ? formatCurrency(v)
        : (typeof v === 'number' ? v.toFixed(2) : String(v));
      return `${label}: ${val}`;
    };
    const text = values.map(mkHover);

    let traces;
    if (kind === 'bar') {
      // For bar charts, use a single trace with per-bar colors to avoid x-position issues
      const colors = values.map((v, i) => i <= cutoffIndex ? '#93c5fd' : '#e5e7eb');
      const lineColors = values.map((v, i) => i <= cutoffIndex ? '#3b82f6' : '#9ca3af');
      traces = [{
        type: 'bar',
        x,
        y: values,
        marker: { 
          color: colors, 
          line: { color: lineColors, width: 1 } 
        },
        text,
        textposition: 'none', // Don't show text on bars
        hovertemplate: '%{text}<extra></extra>'
      }];
    } else {
      // For line charts, include cutoffIndex in both traces to connect them
      const obsTrace = { 
        type: 'scatter', 
        mode: 'lines', 
        x, 
        y: yObs, 
        line: { color: '#3b82f6', width: 2 }, 
        text, 
        hovertemplate: '%{text}<extra></extra>' 
      };
      const futTrace = { 
        type: 'scatter', 
        mode: 'lines', 
        x, 
        y: yFut, 
        line: { color: '#e5e7eb', width: 2 }, 
        hoverinfo: 'skip' 
      };
      traces = [futTrace, obsTrace];
    }

    // Red cutoff line position:
    // - For bar charts: Falls after the last included bar (cutoffIndex + 0.5)
    // - For line charts: Falls on the last included point (cutoffIndex)
    // Using data coordinates with categorical x-axis
    const cutoffX = kind === 'bar' ? cutoffIndex + 0.5 : cutoffIndex;
    
    const layout = {
      height,
      margin: { l: 32, r: 6, t: 8, b: 20 },
      showlegend: false,
      hovermode: 'x',
      shapes: [{
        type: 'line',
        xref: 'x', // Use data coordinates instead of paper
        yref: 'paper',
        x0: cutoffX,
        x1: cutoffX,
        y0: 0, y1: 1,
        line: { color: '#dc2626', width: 2 }
      }],
      xaxis: { fixedrange: true, tickfont: { size: 10 } },
      yaxis: { fixedrange: true, zeroline: false, gridcolor: '#f3f4f6', tickfont: { size: 10 } }
    };

    const config = { displayModeBar: false, responsive: true };

    Plotly.react(elRef.current, traces, layout, config);

    const onResize = () => window.Plotly && window.Plotly.Plots.resize(elRef.current);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [JSON.stringify(values), cutoffIndex, kind, height, labels && labels.join('|'), currency]);

  return <div ref={elRef} className="w-full" />;
}

// Expose globally like your other components
window.PlotlySpark = PlotlySpark;
