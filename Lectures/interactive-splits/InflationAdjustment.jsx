// InflationAdjustment Component
// Displays inflation adjustment visualization and calculations

function InflationAdjustment({
  quarters,
  claimInfo,
  endDate,
  priceIndexMap,
  priceIndexSeries,
  midQuarterIndexMap,
  // "all" (webapp default) | "plot" (index chart only, claim-independent)
  // | "tables" (factor + adjustment tables only). Lets the lecture slides
  // show the plot and the tables on separate slides.
  show = "all"
}) {
  // Use utilities from global scope
  const { getQuarterInfo, formatCurrency } = window.utils;

  // NEW: Build end-of-quarter WPI: w[t] = sqrt( w(t) * w(t+1) ) from quarter-averages w(t)
  const eoqIndexMap = React.useMemo(() => {
    if (!priceIndexSeries || !priceIndexMap) return null;
    const m = {};
    for (let i = 0; i < priceIndexSeries.length - 1; i++) {
      const qk = priceIndexSeries[i].quarterKey;
      const nextQk = priceIndexSeries[i + 1].quarterKey;
      const wCurr = priceIndexMap[qk];
      const wNext = priceIndexMap[nextQk];
      if (wCurr != null && wNext != null) {
        m[qk] = Math.sqrt(wCurr * wNext);
      }
    }
    // Fallback for the last quarter (no look-ahead available)
    const last = priceIndexSeries[priceIndexSeries.length - 1];
    if (last && priceIndexMap[last.quarterKey] != null) {
      m[last.quarterKey] = priceIndexMap[last.quarterKey];
    }
    return m;
  }, [priceIndexSeries, priceIndexMap]);

  return (
    <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
          {/* Price Index chart: plot end-of-quarter (line) and mid-quarter (dots) */}
          {show !== "tables" && <div className={`bg-white rounded border p-3 ${show === "plot" ? "" : "mb-4"}`}>
            <div className="text-xs font-medium text-gray-700 mb-2">WPI: Quarter vs End‑of‑Quarter</div>
            {(() => {
              if (!priceIndexSeries || priceIndexSeries.length === 0) return <div className="text-xs text-gray-500">No index data.</div>;
              const w = 720, h = 180, pad = 32;
              // Quarter-averages w(t)
              const quarterSeries = priceIndexSeries.map(p => ({ quarterKey: p.quarterKey, index: priceIndexMap[p.quarterKey] ?? p.index }));
              // End-of-quarter w[t]
              const eoqSeries = priceIndexSeries.map(p => ({ quarterKey: p.quarterKey, index: (eoqIndexMap && eoqIndexMap[p.quarterKey]) ?? priceIndexMap[p.quarterKey] ?? p.index }));

              const minY = Math.min(Math.min(...quarterSeries.map(p => p.index)), Math.min(...eoqSeries.map(p => p.index))) * 0.98;
              const maxY = Math.max(Math.max(...quarterSeries.map(p => p.index)), Math.max(...eoqSeries.map(p => p.index))) * 1.02;
              const n = quarterSeries.length;
              const xScale = (i) => pad + (i / (n - 1)) * (w - 2 * pad);
              const yScale = (v) => h - pad - ((v - minY) / (maxY - minY)) * (h - 2 * pad);
              const linePath = quarterSeries.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(p.index)}`).join(' ');

              return (
                <svg width="100%" viewBox={`0 0 ${w} ${h}`}>
                  <rect x="0" y="0" width={w} height={h} fill="#ffffff" />
                  {/* Quarter WPI line */}
                  <path d={linePath} fill="none" stroke="#f59e0b" strokeWidth="2" />
                  {/* End-of-quarter dots */}
                  {eoqSeries.map((p, i) => (
                    <circle key={i} cx={xScale(i)} cy={yScale(p.index)} r="2.5" fill="#1d4ed8" />
                  ))}
                  {/* axes */}
                  <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="#e5e7eb" />
                  <line x1={pad} y1={pad} x2={pad} y2={h - pad} stroke="#e5e7eb" />
                  {/* labels */}
                  <text x={pad} y={pad - 8} fontSize="10" fill="#6b7280">Index</text>
                  <text x={pad} y={h - 8} fontSize="10" fill="#6b7280">{priceIndexSeries[0].quarterKey}</text>
                  <text x={w - pad} y={h - 8} fontSize="10" textAnchor="end" fill="#6b7280">{priceIndexSeries[priceIndexSeries.length - 1].quarterKey}</text>
                  <text x={w - pad} y={pad} fontSize="10" textAnchor="end" fill="#6b7280">Orange: Quarter w(t) • Blue: EOQ w[t]</text>
                </svg>
              )
            })()}
          </div>}

          {show !== "plot" && <div className="grid md:grid-cols-2 gap-4">
            {/* Index values & factors for used quarters */}
            <div>
              <div className="text-xs font-medium text-orange-800 mb-2">Quarter & EOQ values and adjustment factors</div>
              <div className="bg-white rounded border overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 py-1 text-left font-medium">Source Quarter</th>
                      <th className="px-2 py-1 text-right font-medium">w(t) source</th>
                      <th className="px-2 py-1 text-right font-medium">w[t] source</th>
                      <th className="px-2 py-1 text-left font-medium">Target Quarter</th>
                      <th className="px-2 py-1 text-right font-medium">w[T] target</th>
                      <th className="px-2 py-1 text-right font-medium">Payments: w[T]/w(t)</th>
                      <th className="px-2 py-1 text-right font-medium">Case est.: w[T]/w[t]</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const usedQs = [...new Set(quarters.map(q => q.quarterKey))].sort();
                      const targetQuarterKey = getQuarterInfo(endDate, claimInfo.accidentDate).quarterKey;
                      const targetEOQ = eoqIndexMap ? eoqIndexMap[targetQuarterKey] : null;
                      return usedQs.map((qk, i) => {
                        const srcQuarter = priceIndexMap ? priceIndexMap[qk] : null; // w(t)
                        const srcEOQ = eoqIndexMap ? eoqIndexMap[qk] : (srcQuarter ?? null); // w[t]
                        const payFactor = (srcQuarter && targetEOQ) ? (targetEOQ / srcQuarter) : 1.0;
                        const caseFactor = (srcEOQ && targetEOQ) ? (targetEOQ / srcEOQ) : 1.0;
                        return (
                          <tr key={i} className="border-t border-gray-100">
                            <td className="px-2 py-1 font-mono">{qk}</td>
                            <td className="px-2 py-1 text-right font-mono">{srcQuarter ? srcQuarter.toFixed(2) : '-'}</td>
                            <td className="px-2 py-1 text-right font-mono">{srcEOQ ? srcEOQ.toFixed(2) : '-'}</td>
                            <td className="px-2 py-1 font-mono">{targetQuarterKey}</td>
                            <td className="px-2 py-1 text-right font-mono">{targetEOQ ? targetEOQ.toFixed(2) : '-'}</td>
                            <td className="px-2 py-1 text-right font-mono">{payFactor.toFixed(4)}</td>
                            <td className="px-2 py-1 text-right font-mono">{caseFactor.toFixed(4)}</td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quarter-level Adjustments Table (uses mid-quarter) */}
            <div>
              <div className="text-xs font-medium text-orange-800 mb-2">Quarter-Level Adjustments</div>
              <div className="bg-white rounded border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Dev Quarter</th>
                      <th className="px-3 py-2 text-left font-medium">Calendar Quarter</th>
                      <th className="px-3 py-2 text-right font-medium">Nominal Sum</th>
                      <th className="px-3 py-2 text-right font-medium">Adj Factor</th>
                      <th className="px-3 py-2 text-right font-medium">Adjusted Sum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quarters.map((quarter, i) => {
                      const calendarQuarterKey = quarter.quarterKey;
                      const targetQuarterKey = getQuarterInfo(endDate, claimInfo.accidentDate).quarterKey;
                      const targetEOQ = eoqIndexMap ? eoqIndexMap[targetQuarterKey] : null; // w[T]
                      const srcQuarter = priceIndexMap ? priceIndexMap[calendarQuarterKey] : null; // w(t)
                      const displayFactor = (srcQuarter && targetEOQ) ? (targetEOQ / srcQuarter) : 1.0; // payments factor
                      const adjustedSum = (quarter.nominalAmount || quarter.totalAmount) * displayFactor;

                      if (quarter.paymentCount === 0) {
                        return (
                          <tr key={i} className="border-t border-gray-100 opacity-60">
                            <td className="px-3 py-2 font-mono">Dev Q{quarter.developmentQuarter}</td>
                            <td className="px-3 py-2 font-mono">{calendarQuarterKey}</td>
                            <td className="px-3 py-2 text-right font-medium">{formatCurrency(quarter.nominalAmount)}</td>
                            <td className="px-3 py-2 text-right text-gray-600 font-mono">-</td>
                            <td className="px-3 py-2 text-right font-medium text-orange-700">{formatCurrency(quarter.nominalAmount)}</td>
                          </tr>
                        );
                      }

                      return (
                        <tr key={i} className="border-t border-gray-100">
                          <td className="px-3 py-2 font-mono">Dev Q{quarter.developmentQuarter}</td>
                          <td className="px-3 py-2 font-mono">{calendarQuarterKey}</td>
                          <td className="px-3 py-2 text-right font-medium">{formatCurrency(quarter.nominalAmount)}</td>
                          <td className="px-3 py-2 text-right text-gray-600 font-mono">{displayFactor.toFixed(4)}</td>
                          <td className="px-3 py-2 text-right font-medium text-orange-700">{formatCurrency(adjustedSum)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>}
    </div>
  );
}

// Make the component globally available
window.InflationAdjustment = InflationAdjustment;
