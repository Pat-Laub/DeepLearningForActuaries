// NeuralNetworkPreprocessing Component
// Displays neural network-specific preprocessing steps

function NeuralNetworkPreprocessing({
  claimData,
  endDate,
  priceIndexMap,
  midQuarterIndexMap,
  oneBasedDevQuarters,
}) {
  const { formatCurrency, getQuarterInfo } = window.utils;

  if (!claimData || !claimData.quarters || !Array.isArray(claimData.quarters) || !claimData.claimInfo) {
    return null;
  }

  // Get the same data as CovariateHistorySummaries
  const { claimInfo, quarters } = claimData;

  // Default to the middle development quarter (like CovariateHistorySummaries)
  // to avoid showing a finalised claim with zero outstanding.
  const devQs = (quarters || []).map(q => q.developmentQuarter);
  const minDevQ = devQs.length ? Math.min(...devQs) : 0;
  const maxDevQ = devQs.length ? Math.max(...devQs) : 0;
  const defaultCutoffDevQ = React.useMemo(
    () => Math.floor((minDevQ + maxDevQ) / 2),
    [minDevQ, maxDevQ]
  );
  const [cutoffDevQ, setCutoffDevQ] = React.useState(defaultCutoffDevQ);

  if (!claimInfo || !claimInfo.accidentDate) {
    return null;
  }

  const dispQ = (dq) => oneBasedDevQuarters ? dq + 1 : dq;

  // Calculate features (same logic as CovariateHistorySummaries)
  const postcodeHistory = [];
  const legalRepHistory = [];
  const adjustedIncrements = [];
  const cumulativeAdj = [];
  let runningTotal = 0;

  for (const q of quarters) {
    if (q.postcode !== null && q.postcode !== undefined) {
      postcodeHistory.push({ devQ: q.developmentQuarter, value: q.postcode });
    }
    if (q.legalRep !== null && q.legalRep !== undefined) {
      legalRepHistory.push({ devQ: q.developmentQuarter, value: q.legalRep });
    }

    const observationQuarter = getQuarterInfo(endDate, claimInfo.accidentDate);
    const targetPI = priceIndexMap ? priceIndexMap[observationQuarter.quarterKey] : null;
    const midMap = midQuarterIndexMap || {};
    const srcMid = midMap[q.quarterKey] || (priceIndexMap ? priceIndexMap[q.quarterKey] : null);
    const factor = (targetPI && srcMid) ? (targetPI / srcMid) : 1.0;
    const adjIncrement = (q.nominalAmount || q.totalAmount) * factor;

    adjustedIncrements.push(adjIncrement);
    runningTotal += adjIncrement;
    cumulativeAdj.push(runningTotal);
  }

  // Calculate ultimate claim size
  const ultimateAdj = adjustedIncrements.reduce((sum, val) => sum + val, 0);

  // The slider state can outlive a claim switch, so clamp it to this claim's range
  const cutoff = Math.max(minDevQ, Math.min(maxDevQ, cutoffDevQ));

  // Calculate features at cutoff
  const postcodeLatest = [...postcodeHistory].reverse().find(x => x.devQ <= cutoff)?.value;
  const legalRepLatest = [...legalRepHistory].reverse().find(x => x.devQ <= cutoff)?.value;

  const incUpToCutoff = adjustedIncrements.filter((_, i) => quarters[i].developmentQuarter <= cutoff);
  const incStats = {
    mean: incUpToCutoff.length > 0 ? incUpToCutoff.reduce((a, b) => a + b, 0) / incUpToCutoff.length : 0,
    max: incUpToCutoff.length > 0 ? Math.max(...incUpToCutoff) : 0,
    sd: incUpToCutoff.length > 1 
      ? Math.sqrt(incUpToCutoff.reduce((sum, val) => sum + Math.pow(val - (incUpToCutoff.reduce((a, b) => a + b, 0) / incUpToCutoff.length), 2), 0) / incUpToCutoff.length)
      : 0,
  };

  const cumUpToCutoff = cumulativeAdj.filter((_, i) => quarters[i].developmentQuarter <= cutoff);
  const cumStats = {
    last: cumUpToCutoff.length > 0 ? cumUpToCutoff[cumUpToCutoff.length - 1] : 0,
  };

  // Calculate true outstanding and the case estimate with error (same as CovariateHistorySummaries)
  const trueOutstanding = cumulativeAdj.map(c => Math.max(0, ultimateAdj - c));
  
  // Add estimation error to the case estimate
  const mulberry32 = (a) => {
    return function() {
      let t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  };
  const claimIdNum = parseInt(claimInfo.claimId.replace(/\D/g, ''), 10) || 1;
  
  const remainingAdj = trueOutstanding.map((trueVal, i) => {
    const progress = (i + 1) / Math.max(1, trueOutstanding.length);
    const baseErrorPct = 0.25 * (1 - progress * 0.7);
    const rng = mulberry32(claimIdNum * 1000 + i);
    const errorFactor = 1 + baseErrorPct * (2 * rng() - 1);
    return Math.max(0, trueVal * errorFactor);
  });

  const remUpToCutoff = remainingAdj.filter((_, i) => quarters[i].developmentQuarter <= cutoff);
  const remStats = {
    last: remUpToCutoff.length > 0 ? remUpToCutoff[remUpToCutoff.length - 1] : 0,
  };

  const trueOutstandingStats = {
    last: trueOutstanding.filter((_, i) => quarters[i].developmentQuarter <= cutoff).slice(-1)[0] || 0,
  };

  // Apply log1p transformation to dollar amounts
  const log1p = (x) => Math.log(1 + x);

  const cutoffQuarterKey = quarters.find(q => q.developmentQuarter === cutoff)?.quarterKey;

  return (
    <div className="mb-4 p-4 bg-teal-50 rounded-lg border border-teal-200">
      <div className="text-sm text-teal-800 space-y-3">
        {/* Control row */}
        <div className="bg-white rounded border p-3">
          <div className="flex flex-col md:flex-row md:items-center md:gap-4">
            <div className="text-xs font-medium text-gray-700 mb-2 md:mb-0">
              Choose valuation quarter:
            </div>
            <div className="flex-1 flex items-center gap-3">
              <span className="text-xs text-gray-600 font-mono">Dev Q{dispQ(minDevQ)}</span>
              <input
                type="range"
                min={minDevQ}
                max={maxDevQ}
                value={cutoff}
                onChange={(e) => setCutoffDevQ(parseInt(e.target.value, 10))}
                className="w-full"
              />
              <span className="text-xs text-gray-600 font-mono">Dev Q{dispQ(maxDevQ)}</span>
            </div>
            <div className="text-xs text-gray-700">
              <span className="font-mono bg-teal-100 px-1 rounded mr-1">Valuation: Dev Q{dispQ(cutoff)}</span>
              <span className="font-mono bg-gray-100 px-1 rounded">{cutoffQuarterKey || '-'}</span>
            </div>
          </div>
        </div>

        {/* Show log-transformed table */}
        <div className="bg-white rounded border p-3">
          <div className="text-xs font-medium text-gray-700 mb-2">
            Training Row with Log-Transformed Dollar Features
          </div>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Feature</th>
                  <th className="px-3 py-2 text-left font-medium">Original Value</th>
                  <th className="px-3 py-2 text-right font-medium">log(1 + x)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t">
                  <td className="px-3 py-2 font-mono">postcode_latest</td>
                  <td className="px-3 py-2 text-gray-500 italic" colSpan="2">
                    (categorical - will be one-hot encoded)
                  </td>
                </tr>
                <tr className="border-t">
                  <td className="px-3 py-2 font-mono">legal_rep_latest</td>
                  <td className="px-3 py-2 text-gray-500 italic" colSpan="2">
                    (categorical - will be one-hot encoded)
                  </td>
                </tr>
                <tr className="border-t">
                  <td className="px-3 py-2 font-mono">inc_paid_mean_q1..k</td>
                  <td className="px-3 py-2">{formatCurrency(incStats.mean)}</td>
                  <td className="px-3 py-2 text-right font-mono text-teal-700">{log1p(incStats.mean).toFixed(4)}</td>
                </tr>
                <tr className="border-t">
                  <td className="px-3 py-2 font-mono">inc_paid_max_q1..k</td>
                  <td className="px-3 py-2">{formatCurrency(incStats.max)}</td>
                  <td className="px-3 py-2 text-right font-mono text-teal-700">{log1p(incStats.max).toFixed(4)}</td>
                </tr>
                <tr className="border-t">
                  <td className="px-3 py-2 font-mono">inc_paid_sd_q1..k</td>
                  <td className="px-3 py-2">{formatCurrency(incStats.sd)}</td>
                  <td className="px-3 py-2 text-right font-mono text-teal-700">{log1p(incStats.sd).toFixed(4)}</td>
                </tr>
                <tr className="border-t">
                  <td className="px-3 py-2 font-mono">cum_paid_last_qk</td>
                  <td className="px-3 py-2">{formatCurrency(cumStats.last)}</td>
                  <td className="px-3 py-2 text-right font-mono text-teal-700">{log1p(cumStats.last).toFixed(4)}</td>
                </tr>
                <tr className="border-t">
                  <td className="px-3 py-2 font-mono">case_estimate</td>
                  <td className="px-3 py-2 text-red-700">{formatCurrency(remStats.last)}</td>
                  <td className="px-3 py-2 text-right font-mono text-teal-700">{log1p(remStats.last).toFixed(4)}</td>
                </tr>
                <tr className="border-t-2 border-indigo-300 bg-indigo-50">
                  <td className="px-3 py-2 font-mono font-bold">outstanding</td>
                  <td className="px-3 py-2 font-bold text-indigo-700" colSpan="2">{formatCurrency(trueOutstandingStats.last)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// Make the component globally available
window.NeuralNetworkPreprocessing = NeuralNetworkPreprocessing;
