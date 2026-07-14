// components/CovariateHistorySummaries.jsx
// Summarises covariate histories as-of a chosen development quarter,
// and uses PlotlySpark for compact charts.

function CovariateHistorySummaries({
  claimData,
  endDate,
  priceIndexMap,
  midQuarterIndexMap,
  oneBasedDevQuarters
}) {
  const { getQuarterInfo, formatCurrency } = window.utils || {};

  if (!claimData || !claimData.quarters || !Array.isArray(claimData.quarters) || !getQuarterInfo) {
    return null;
  }

  const { claimInfo, quarters } = claimData;

  // Sort and index quarters
  const qSorted = React.useMemo(
    () => [...quarters].sort((a, b) => a.developmentQuarter - b.developmentQuarter),
    [quarters]
  );

  const devQs = qSorted.map(q => q.developmentQuarter);
  const minDevQ = Math.min(...devQs);
  const maxDevQ = Math.max(...devQs);
  const byDev = React.useMemo(
    () => Object.fromEntries(qSorted.map(q => [q.developmentQuarter, q])),
    [qSorted]
  );

  // Set default cutoff to middle of range to avoid finalised (zero outstanding) quarters
  const defaultCutoffDevQ = React.useMemo(
    () => Math.floor((minDevQ + maxDevQ) / 2),
    [minDevQ, maxDevQ]
  );

  const [cutoffDevQ, setCutoffDevQ] = React.useState(defaultCutoffDevQ);

  const dispQ = (dq) => oneBasedDevQuarters ? dq + 1 : dq;
  const toRange = (start, end) =>
    Array.from({ length: end - start + 1 }, (_, i) => start + i);

  // ---- Near-static covariates (illustrative histories) ---------------------
  const notifyDevQ = getQuarterInfo(claimInfo.notifyDate, claimInfo.accidentDate).developmentQuarter;
  const postcodeKnownFrom = Math.max(minDevQ, notifyDevQ);
  const legalRepKnownFrom = Math.min(maxDevQ, postcodeKnownFrom + 2);

  const devRange = toRange(minDevQ, maxDevQ);
  const postcodeHistory = devRange.map(dq => (dq < postcodeKnownFrom ? null : claimInfo.postcode));
  const legalRepHistory = devRange.map(dq => (dq < legalRepKnownFrom ? null : 'Yes'));

  const latestNonMissing = (hist, uptoIdx) => {
    for (let i = Math.min(uptoIdx, hist.length - 1); i >= 0; i--) {
      if (hist[i] !== null && hist[i] !== undefined) return hist[i];
    }
    return null;
  };

  const cutoffIndex = Math.max(0, Math.min(devRange.length - 1, cutoffDevQ - minDevQ));

  const postcodeLatest = latestNonMissing(postcodeHistory, cutoffIndex);
  const legalRepLatest = latestNonMissing(legalRepHistory, cutoffIndex);

  // ---- Time-series covariates ----------------------------------------------
  // Incremental paid per dev quarter (nominal)
  const increments = devRange.map(dq => {
    const q = byDev[dq];
    const v = q ? (q.nominalAmount ?? q.totalAmount ?? 0) : 0;
    return isFinite(v) ? v : 0;
  });

  // Cumulative paid to date (nominal)
  const cumulative = (() => {
    const out = [];
    let s = 0;
    for (let i = 0; i < increments.length; i++) {
      s += increments[i];
      out.push(s);
    }
    return out;
  })();

  // Incurred (estimator's assessment of remaining liability, inflation-adjusted to observation quarter)
  const adjustedIncrements = (() => {
    const obsQ = getQuarterInfo(endDate, claimInfo.accidentDate);
    const targetPI = priceIndexMap ? priceIndexMap[obsQ.quarterKey] : null;
    const midMap = midQuarterIndexMap || {};
    return devRange.map((dq) => {
      const q = byDev[dq];
      const nominal = q ? (q.nominalAmount ?? q.totalAmount ?? 0) : 0;
      const srcPI = q
        ? (midMap[q.quarterKey] || (priceIndexMap ? priceIndexMap[q.quarterKey] : null))
        : null;
      const factor = (srcPI && targetPI) ? (targetPI / srcPI) : 1.0;
      return nominal * factor;
    });
  })();

  const cumulativeAdj = (() => {
    const out = [];
    let s = 0;
    for (let i = 0; i < adjustedIncrements.length; i++) {
      s += adjustedIncrements[i];
      out.push(s);
    }
    return out;
  })();

  const ultimateAdj = cumulativeAdj[cumulativeAdj.length - 1] || 0;
  
  // Calculate true outstanding liability (unknowable in practice)
  const trueOutstanding = cumulativeAdj.map(c => Math.max(0, ultimateAdj - c));
  
  // Generate incurred estimates with realistic estimation error
  // Incurred should be correlated with but different from true outstanding
  const remainingAdj = React.useMemo(() => {
    // Use claim ID to seed the noise generation for consistency
    const claimSeed = claimInfo.claimId ? claimInfo.claimId.charCodeAt(claimInfo.claimId.length - 1) : 42;
    
    return trueOutstanding.map((trueValue, idx) => {
      if (trueValue === 0) return 0; // If truly finalised, estimator knows it's finalised
      
      // Generate estimation error that's correlated with development
      // Early estimates tend to have more error, later estimates are more accurate
      const progress = idx / Math.max(1, trueOutstanding.length - 1);
      const baseErrorPct = 0.25 * (1 - progress * 0.7); // 25% error early, 7.5% error late
      
      // Deterministic "random" noise based on claim and development period
      const noiseSeed = claimSeed * 1000 + idx;
      const pseudoRandom = (Math.sin(noiseSeed) * 10000) % 1;
      const errorMultiplier = 1 + baseErrorPct * (2 * pseudoRandom - 1);
      
      // Apply error and ensure non-negative
      return Math.max(0, trueValue * errorMultiplier);
    });
  }, [claimInfo.claimId, ultimateAdj, JSON.stringify(cumulativeAdj)]);

  // Summary stats up to cutoff
  const statsUpTo = (arr, endIdx) => {
    const n = Math.max(0, endIdx + 1);
    if (n === 0) return { n: 0, sum: 0, mean: 0, max: 0, sd: 0, last: 0 };
    let sum = 0, max = -Infinity;
    for (let i = 0; i <= endIdx; i++) {
      const v = arr[i] ?? 0;
      sum += v;
      if (v > max) max = v;
    }
    const mean = sum / n;
    let varSum = 0;
    for (let i = 0; i <= endIdx; i++) {
      const v = arr[i] ?? 0;
      varSum += (v - mean) * (v - mean);
    }
    const sd = n > 1 ? Math.sqrt(varSum / (n - 1)) : 0;
    const last = arr[endIdx] ?? 0;
    return { n, sum, mean, max: isFinite(max) ? max : 0, sd, last };
  };

  // Use inflation-adjusted values for all stats
  const incStats = statsUpTo(adjustedIncrements, cutoffIndex);
  const cumStats = statsUpTo(cumulativeAdj, cutoffIndex);
  const remStats = statsUpTo(remainingAdj, cutoffIndex); // Incurred estimates (with error)
  const trueOutstandingStats = statsUpTo(trueOutstanding, cutoffIndex); // True outstanding (target)

  // Check if outstanding liability is zero (claim is finalised)
  const isZeroOutstanding = Math.round(trueOutstandingStats.last * 100) === 0;

  // Labels
  const devLabels = devRange.map(dq => byDev[dq]?.quarterKey || `Q${dispQ(dq)}`);
  const cutoffQuarterKey = byDev[cutoffDevQ]?.quarterKey;

  const Spark = window.PlotlySpark;

  return (
    <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
          {/* Control row */}
          <div className="bg-white rounded border p-3 mb-4">
            <div className="flex flex-col md:flex-row md:items-center md:gap-4">
              <div className="text-xs font-medium text-gray-700 mb-2 md:mb-0">
                Choose development cutoff:
              </div>
              <div className="flex-1 flex items-center gap-3">
                <span className="text-xs text-gray-600 font-mono">Dev Q{dispQ(minDevQ)}</span>
                <input
                  type="range"
                  min={minDevQ}
                  max={maxDevQ}
                  value={cutoffDevQ}
                  onChange={(e) => setCutoffDevQ(parseInt(e.target.value, 10))}
                  className="w-full"
                />
                <span className="text-xs text-gray-600 font-mono">Dev Q{dispQ(maxDevQ)}</span>
              </div>
              <div className="text-xs text-gray-700">
                <span className="font-mono bg-indigo-100 px-1 rounded mr-1">Cutoff: Dev Q{dispQ(cutoffDevQ)}</span>
                <span className="font-mono bg-gray-100 px-1 rounded">{cutoffQuarterKey || '-'}</span>
              </div>
            </div>
            {isZeroOutstanding && (
              <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
                ⚠️ Outstanding liability is $0.00 at this cutoff; such rows are discarded before training.
              </div>
            )}
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            {/* Near-static summarisation */}
            <div className="bg-white rounded border p-3">
              <div className="text-xs font-medium text-gray-700 mb-2">Near‑Static Covariates (latest up to cutoff)</div>

              {/* Small per-quarter table */}
              <div className="overflow-auto border rounded mb-3">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-2 py-2 text-left font-medium">Dev Q</th>
                      <th className="px-2 py-2 text-left font-medium">Calendar Q</th>
                      <th className="px-2 py-2 text-left font-medium">Postcode</th>
                      <th className="px-2 py-2 text-left font-medium">Legal Rep</th>
                    </tr>
                  </thead>
                  <tbody>
                    {devRange.map((dq, i) => {
                      const q = byDev[dq];
                      const pastCut = dq > cutoffDevQ;
                      return (
                        <tr key={dq} className={`border-t ${pastCut ? 'opacity-50' : ''}`}>
                          <td className="px-2 py-2 font-mono">Q{dispQ(dq)}</td>
                          <td className="px-2 py-2 font-mono">{q ? q.quarterKey : '-'}</td>
                          <td className="px-2 py-2 font-mono">{postcodeHistory[i] ?? 'NA'}</td>
                          <td className="px-2 py-2 font-mono">{legalRepHistory[i] ?? 'NA'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Summarised values as-of cutoff */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-indigo-50 border border-indigo-100 rounded p-2 text-xs">
                  <div className="text-gray-600">Most recent Postcode</div>
                  <div className="font-mono text-indigo-900 text-sm">
                    {postcodeLatest ?? 'NA'}
                  </div>
                </div>
                <div className="bg-indigo-50 border border-indigo-100 rounded p-2 text-xs">
                  <div className="text-gray-600">Claimant has legal representation</div>
                  <div className="font-mono text-indigo-900 text-sm">
                    {legalRepLatest ?? 'NA'}
                  </div>
                </div>
              </div>
            </div>

            {/* Time-series summarisation */}
            <div className="bg-white rounded border p-3">
              <div className="text-xs font-medium text-gray-700 mb-2">Time‑Series Covariates (summary up to cutoff)</div>

              <div className="space-y-3">
                {/* Incremental payments (bar) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-xs text-gray-600">Incremental payments</div>
                  </div>
                  <Spark kind="bar" values={adjustedIncrements} labels={devLabels} cutoffIndex={cutoffIndex} height={110} currency />
                  <div className="grid grid-cols-4 gap-2 mt-2 text-xs">
                    <div className="bg-gray-50 border rounded p-2">
                      <div className="text-gray-600">Mean</div>
                      <div className="font-medium">{formatCurrency ? formatCurrency(incStats.mean) : incStats.mean.toFixed(2)}</div>
                    </div>
                    <div className="bg-gray-50 border rounded p-2">
                      <div className="text-gray-600">Max</div>
                      <div className="font-medium">{formatCurrency ? formatCurrency(incStats.max) : incStats.max.toFixed(2)}</div>
                    </div>
                    <div className="bg-gray-50 border rounded p-2">
                      <div className="text-gray-600">SD</div>
                      <div className="font-medium">{formatCurrency ? formatCurrency(incStats.sd) : incStats.sd.toFixed(2)}</div>
                    </div>
                    <div className="bg-gray-50 border rounded p-2">
                      <div className="text-gray-600">Sum</div>
                      <div className="font-medium">{formatCurrency ? formatCurrency(incStats.sum) : incStats.sum.toFixed(2)}</div>
                    </div>
                  </div>
                </div>

                {/* Cumulative paid (line) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-xs text-gray-600">Cumulative paid to date</div>
                  </div>
                  <Spark kind="line" values={cumulativeAdj} labels={devLabels} cutoffIndex={cutoffIndex} height={110} currency />
                  <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                    <div className="bg-gray-50 border rounded p-2">
                      <div className="text-gray-600">Last (as‑of cutoff)</div>
                      <div className="font-medium">{formatCurrency ? formatCurrency(cumStats.last) : cumStats.last.toFixed(2)}</div>
                    </div>
                    <div className="bg-gray-50 border rounded p-2">
                      <div className="text-gray-600">Min/Max (to cutoff)</div>
                      <div className="font-medium">
                        {formatCurrency ? formatCurrency(Math.min(...cumulativeAdj.slice(0, cutoffIndex + 1))) : Math.min(...cumulativeAdj.slice(0, cutoffIndex + 1)).toFixed(2)}
                        {' '}–{' '}
                        {formatCurrency ? formatCurrency(Math.max(...cumulativeAdj.slice(0, cutoffIndex + 1))) : Math.max(...cumulativeAdj.slice(0, cutoffIndex + 1)).toFixed(2)}
                      </div>
                    </div>
                    <div className="bg-gray-50 border rounded p-2">
                      <div className="text-gray-600"># Quarters</div>
                      <div className="font-medium">{incStats.n}</div>
                    </div>
                  </div>
                </div>

                {/* Incurred */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-xs text-gray-600">Incurred</div>
                  </div>
                  <Spark kind="line" values={remainingAdj} labels={devLabels} cutoffIndex={cutoffIndex} height={110} currency />
                  <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                    <div className="bg-gray-50 border rounded p-2">
                      <div className="text-gray-600">Last (as‑of cutoff)</div>
                      <div className="font-medium text-red-700">
                        {formatCurrency ? formatCurrency(remStats.last) : remStats.last.toFixed(2)}
                      </div>
                    </div>
                    <div className="bg-gray-50 border rounded p-2">
                      <div className="text-gray-600">Ultimate</div>
                      <div className="font-medium">
                        {formatCurrency ? formatCurrency(ultimateAdj) : ultimateAdj.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Final "features as-of cutoff" table */}
          <div className="bg-white rounded border p-3 mt-4">
            <div className="text-xs font-medium text-gray-700 mb-2">Training Row (as‑of Dev Q{dispQ(cutoffDevQ)})</div>
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Feature</th>
                    <th className="px-3 py-2 text-left font-medium">Type</th>
                    <th className="px-3 py-2 text-left font-medium">Rule</th>
                    <th className="px-3 py-2 text-right font-medium">Value</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t">
                    <td className="px-3 py-2 font-mono">postcode_latest</td>
                    <td className="px-3 py-2">Near‑static</td>
                    <td className="px-3 py-2">Latest non‑missing ≤ cutoff</td>
                    <td className="px-3 py-2 text-right font-mono">{postcodeLatest ?? 'NA'}</td>
                  </tr>
                  <tr className="border-t">
                    <td className="px-3 py-2 font-mono">legal_rep_latest</td>
                    <td className="px-3 py-2">Near‑static</td>
                    <td className="px-3 py-2">Latest non‑missing ≤ cutoff</td>
                    <td className="px-3 py-2 text-right font-mono">{legalRepLatest ?? 'NA'}</td>
                  </tr>
                  <tr className="border-t">
                    <td className="px-3 py-2 font-mono">inc_paid_mean_q1..k</td>
                    <td className="px-3 py-2">Time‑series</td>
                    <td className="px-3 py-2">Mean of increments ≤ cutoff</td>
                    <td className="px-3 py-2 text-right">{formatCurrency ? formatCurrency(incStats.mean) : incStats.mean.toFixed(2)}</td>
                  </tr>
                  <tr className="border-t">
                    <td className="px-3 py-2 font-mono">inc_paid_max_q1..k</td>
                    <td className="px-3 py-2">Time‑series</td>
                    <td className="px-3 py-2">Max of increments ≤ cutoff</td>
                    <td className="px-3 py-2 text-right">{formatCurrency ? formatCurrency(incStats.max) : incStats.max.toFixed(2)}</td>
                  </tr>
                  <tr className="border-t">
                    <td className="px-3 py-2 font-mono">inc_paid_sd_q1..k</td>
                    <td className="px-3 py-2">Time‑series</td>
                    <td className="px-3 py-2">Std dev of increments ≤ cutoff</td>
                    <td className="px-3 py-2 text-right">{formatCurrency ? formatCurrency(incStats.sd) : incStats.sd.toFixed(2)}</td>
                  </tr>
                  <tr className="border-t">
                    <td className="px-3 py-2 font-mono">cum_paid_last_qk</td>
                    <td className="px-3 py-2">Time‑series</td>
                    <td className="px-3 py-2">Last observed ≤ cutoff</td>
                    <td className="px-3 py-2 text-right">{formatCurrency ? formatCurrency(cumStats.last) : cumStats.last.toFixed(2)}</td>
                  </tr>
                  <tr className="border-t">
                    <td className="px-3 py-2 font-mono">incurred_last_qk</td>
                    <td className="px-3 py-2">Time‑series</td>
                    <td className="px-3 py-2">Incurred (last observed ≤ cutoff)</td>
                    <td className="px-3 py-2 text-right text-red-700">{formatCurrency ? formatCurrency(remStats.last) : remStats.last.toFixed(2)}</td>
                  </tr>
                  <tr className="border-t-2 border-indigo-300 bg-indigo-50">
                    <td className="px-3 py-2 font-mono font-bold">outstanding_liability</td>
                    <td className="px-3 py-2 font-bold">Target</td>
                    <td className="px-3 py-2">Remaining at cutoff (actual)</td>
                    <td className="px-3 py-2 text-right font-bold text-indigo-900">{formatCurrency ? formatCurrency(trueOutstandingStats.last) : trueOutstandingStats.last.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
    </div>
  );
}

window.CovariateHistorySummaries = CovariateHistorySummaries;
