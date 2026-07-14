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
  const qSorted = React.useMemo(
    () => [...quarters].sort((a, b) => a.developmentQuarter - b.developmentQuarter),
    [quarters]
  );
  const devQs = qSorted.map((q) => q.developmentQuarter);
  const minDevQ = Math.min(...devQs);
  const maxDevQ = Math.max(...devQs);
  const byDev = React.useMemo(
    () => Object.fromEntries(qSorted.map((q) => [q.developmentQuarter, q])),
    [qSorted]
  );
  const defaultCutoffDevQ = React.useMemo(
    () => Math.floor((minDevQ + maxDevQ) / 2),
    [minDevQ, maxDevQ]
  );
  const [cutoffDevQ, setCutoffDevQ] = React.useState(defaultCutoffDevQ);
  const dispQ = (dq) => oneBasedDevQuarters ? dq + 1 : dq;
  const toRange = (start, end) => Array.from({ length: end - start + 1 }, (_, i) => start + i);
  const notifyDevQ = getQuarterInfo(claimInfo.notifyDate, claimInfo.accidentDate).developmentQuarter;
  const postcodeKnownFrom = Math.max(minDevQ, notifyDevQ);
  const legalRepKnownFrom = Math.min(maxDevQ, postcodeKnownFrom + 2);
  const devRange = toRange(minDevQ, maxDevQ);
  const postcodeHistory = devRange.map((dq) => dq < postcodeKnownFrom ? null : claimInfo.postcode);
  const legalRepHistory = devRange.map((dq) => dq < legalRepKnownFrom ? null : "Yes");
  const latestNonMissing = (hist, uptoIdx) => {
    for (let i = Math.min(uptoIdx, hist.length - 1); i >= 0; i--) {
      if (hist[i] !== null && hist[i] !== void 0) return hist[i];
    }
    return null;
  };
  const cutoffIndex = Math.max(0, Math.min(devRange.length - 1, cutoffDevQ - minDevQ));
  const postcodeLatest = latestNonMissing(postcodeHistory, cutoffIndex);
  const legalRepLatest = latestNonMissing(legalRepHistory, cutoffIndex);
  const increments = devRange.map((dq) => {
    const q = byDev[dq];
    const v = q ? q.nominalAmount ?? q.totalAmount ?? 0 : 0;
    return isFinite(v) ? v : 0;
  });
  const cumulative = (() => {
    const out = [];
    let s = 0;
    for (let i = 0; i < increments.length; i++) {
      s += increments[i];
      out.push(s);
    }
    return out;
  })();
  const adjustedIncrements = (() => {
    const obsQ = getQuarterInfo(endDate, claimInfo.accidentDate);
    const targetPI = priceIndexMap ? priceIndexMap[obsQ.quarterKey] : null;
    const midMap = midQuarterIndexMap || {};
    return devRange.map((dq) => {
      const q = byDev[dq];
      const nominal = q ? q.nominalAmount ?? q.totalAmount ?? 0 : 0;
      const srcPI = q ? midMap[q.quarterKey] || (priceIndexMap ? priceIndexMap[q.quarterKey] : null) : null;
      const factor = srcPI && targetPI ? targetPI / srcPI : 1;
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
  const trueOutstanding = cumulativeAdj.map((c) => Math.max(0, ultimateAdj - c));
  const remainingAdj = React.useMemo(() => {
    const claimSeed = claimInfo.claimId ? claimInfo.claimId.charCodeAt(claimInfo.claimId.length - 1) : 42;
    return trueOutstanding.map((trueValue, idx) => {
      if (trueValue === 0) return 0;
      const progress = idx / Math.max(1, trueOutstanding.length - 1);
      const baseErrorPct = 0.25 * (1 - progress * 0.7);
      const noiseSeed = claimSeed * 1e3 + idx;
      const pseudoRandom = Math.sin(noiseSeed) * 1e4 % 1;
      const errorMultiplier = 1 + baseErrorPct * (2 * pseudoRandom - 1);
      return Math.max(0, trueValue * errorMultiplier);
    });
  }, [claimInfo.claimId, ultimateAdj, JSON.stringify(cumulativeAdj)]);
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
  const incStats = statsUpTo(adjustedIncrements, cutoffIndex);
  const cumStats = statsUpTo(cumulativeAdj, cutoffIndex);
  const remStats = statsUpTo(remainingAdj, cutoffIndex);
  const trueOutstandingStats = statsUpTo(trueOutstanding, cutoffIndex);
  const isZeroOutstanding = Math.round(trueOutstandingStats.last * 100) === 0;
  const devLabels = devRange.map((dq) => byDev[dq]?.quarterKey || `Q${dispQ(dq)}`);
  const cutoffQuarterKey = byDev[cutoffDevQ]?.quarterKey;
  const Spark = window.PlotlySpark;
  return /* @__PURE__ */ React.createElement("div", { className: "bg-indigo-50 p-4 rounded-lg border border-indigo-200" }, /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded border p-3 mb-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col md:flex-row md:items-center md:gap-4" }, /* @__PURE__ */ React.createElement("div", { className: "text-xs font-medium text-gray-700 mb-2 md:mb-0" }, "Choose development cutoff:"), /* @__PURE__ */ React.createElement("div", { className: "flex-1 flex items-center gap-3" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs text-gray-600 font-mono" }, "Dev Q", dispQ(minDevQ)), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "range",
      min: minDevQ,
      max: maxDevQ,
      value: cutoffDevQ,
      onChange: (e) => setCutoffDevQ(parseInt(e.target.value, 10)),
      className: "w-full"
    }
  ), /* @__PURE__ */ React.createElement("span", { className: "text-xs text-gray-600 font-mono" }, "Dev Q", dispQ(maxDevQ))), /* @__PURE__ */ React.createElement("div", { className: "text-xs text-gray-700" }, /* @__PURE__ */ React.createElement("span", { className: "font-mono bg-indigo-100 px-1 rounded mr-1" }, "Cutoff: Dev Q", dispQ(cutoffDevQ)), /* @__PURE__ */ React.createElement("span", { className: "font-mono bg-gray-100 px-1 rounded" }, cutoffQuarterKey || "-"))), isZeroOutstanding && /* @__PURE__ */ React.createElement("div", { className: "mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800" }, "\u26A0\uFE0F Outstanding liability is $0.00 at this cutoff; such rows are discarded before training.")), /* @__PURE__ */ React.createElement("div", { className: "grid lg:grid-cols-2 gap-4" }, /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded border p-3" }, /* @__PURE__ */ React.createElement("div", { className: "text-xs font-medium text-gray-700 mb-2" }, "Near\u2011Static Covariates (latest up to cutoff)"), /* @__PURE__ */ React.createElement("div", { className: "overflow-auto border rounded mb-3" }, /* @__PURE__ */ React.createElement("table", { className: "w-full text-xs" }, /* @__PURE__ */ React.createElement("thead", { className: "bg-gray-50 sticky top-0" }, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", { className: "px-2 py-2 text-left font-medium" }, "Dev Q"), /* @__PURE__ */ React.createElement("th", { className: "px-2 py-2 text-left font-medium" }, "Calendar Q"), /* @__PURE__ */ React.createElement("th", { className: "px-2 py-2 text-left font-medium" }, "Postcode"), /* @__PURE__ */ React.createElement("th", { className: "px-2 py-2 text-left font-medium" }, "Legal Rep"))), /* @__PURE__ */ React.createElement("tbody", null, devRange.map((dq, i) => {
    const q = byDev[dq];
    const pastCut = dq > cutoffDevQ;
    return /* @__PURE__ */ React.createElement("tr", { key: dq, className: `border-t ${pastCut ? "opacity-50" : ""}` }, /* @__PURE__ */ React.createElement("td", { className: "px-2 py-2 font-mono" }, "Q", dispQ(dq)), /* @__PURE__ */ React.createElement("td", { className: "px-2 py-2 font-mono" }, q ? q.quarterKey : "-"), /* @__PURE__ */ React.createElement("td", { className: "px-2 py-2 font-mono" }, postcodeHistory[i] ?? "NA"), /* @__PURE__ */ React.createElement("td", { className: "px-2 py-2 font-mono" }, legalRepHistory[i] ?? "NA"));
  })))), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "bg-indigo-50 border border-indigo-100 rounded p-2 text-xs" }, /* @__PURE__ */ React.createElement("div", { className: "text-gray-600" }, "Most recent Postcode"), /* @__PURE__ */ React.createElement("div", { className: "font-mono text-indigo-900 text-sm" }, postcodeLatest ?? "NA")), /* @__PURE__ */ React.createElement("div", { className: "bg-indigo-50 border border-indigo-100 rounded p-2 text-xs" }, /* @__PURE__ */ React.createElement("div", { className: "text-gray-600" }, "Claimant has legal representation"), /* @__PURE__ */ React.createElement("div", { className: "font-mono text-indigo-900 text-sm" }, legalRepLatest ?? "NA")))), /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded border p-3" }, /* @__PURE__ */ React.createElement("div", { className: "text-xs font-medium text-gray-700 mb-2" }, "Time\u2011Series Covariates (summary up to cutoff)"), /* @__PURE__ */ React.createElement("div", { className: "space-y-3" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-1" }, /* @__PURE__ */ React.createElement("div", { className: "text-xs text-gray-600" }, "Incremental payments")), /* @__PURE__ */ React.createElement(Spark, { kind: "bar", values: adjustedIncrements, labels: devLabels, cutoffIndex, height: 110, currency: true }), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-4 gap-2 mt-2 text-xs" }, /* @__PURE__ */ React.createElement("div", { className: "bg-gray-50 border rounded p-2" }, /* @__PURE__ */ React.createElement("div", { className: "text-gray-600" }, "Mean"), /* @__PURE__ */ React.createElement("div", { className: "font-medium" }, formatCurrency ? formatCurrency(incStats.mean) : incStats.mean.toFixed(2))), /* @__PURE__ */ React.createElement("div", { className: "bg-gray-50 border rounded p-2" }, /* @__PURE__ */ React.createElement("div", { className: "text-gray-600" }, "Max"), /* @__PURE__ */ React.createElement("div", { className: "font-medium" }, formatCurrency ? formatCurrency(incStats.max) : incStats.max.toFixed(2))), /* @__PURE__ */ React.createElement("div", { className: "bg-gray-50 border rounded p-2" }, /* @__PURE__ */ React.createElement("div", { className: "text-gray-600" }, "SD"), /* @__PURE__ */ React.createElement("div", { className: "font-medium" }, formatCurrency ? formatCurrency(incStats.sd) : incStats.sd.toFixed(2))), /* @__PURE__ */ React.createElement("div", { className: "bg-gray-50 border rounded p-2" }, /* @__PURE__ */ React.createElement("div", { className: "text-gray-600" }, "Sum"), /* @__PURE__ */ React.createElement("div", { className: "font-medium" }, formatCurrency ? formatCurrency(incStats.sum) : incStats.sum.toFixed(2))))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-1" }, /* @__PURE__ */ React.createElement("div", { className: "text-xs text-gray-600" }, "Cumulative paid to date")), /* @__PURE__ */ React.createElement(Spark, { kind: "line", values: cumulativeAdj, labels: devLabels, cutoffIndex, height: 110, currency: true }), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-3 gap-2 mt-2 text-xs" }, /* @__PURE__ */ React.createElement("div", { className: "bg-gray-50 border rounded p-2" }, /* @__PURE__ */ React.createElement("div", { className: "text-gray-600" }, "Last (as\u2011of cutoff)"), /* @__PURE__ */ React.createElement("div", { className: "font-medium" }, formatCurrency ? formatCurrency(cumStats.last) : cumStats.last.toFixed(2))), /* @__PURE__ */ React.createElement("div", { className: "bg-gray-50 border rounded p-2" }, /* @__PURE__ */ React.createElement("div", { className: "text-gray-600" }, "Min/Max (to cutoff)"), /* @__PURE__ */ React.createElement("div", { className: "font-medium" }, formatCurrency ? formatCurrency(Math.min(...cumulativeAdj.slice(0, cutoffIndex + 1))) : Math.min(...cumulativeAdj.slice(0, cutoffIndex + 1)).toFixed(2), " ", "\u2013", " ", formatCurrency ? formatCurrency(Math.max(...cumulativeAdj.slice(0, cutoffIndex + 1))) : Math.max(...cumulativeAdj.slice(0, cutoffIndex + 1)).toFixed(2))), /* @__PURE__ */ React.createElement("div", { className: "bg-gray-50 border rounded p-2" }, /* @__PURE__ */ React.createElement("div", { className: "text-gray-600" }, "# Quarters"), /* @__PURE__ */ React.createElement("div", { className: "font-medium" }, incStats.n)))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-1" }, /* @__PURE__ */ React.createElement("div", { className: "text-xs text-gray-600" }, "Incurred")), /* @__PURE__ */ React.createElement(Spark, { kind: "line", values: remainingAdj, labels: devLabels, cutoffIndex, height: 110, currency: true }), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-2 mt-2 text-xs" }, /* @__PURE__ */ React.createElement("div", { className: "bg-gray-50 border rounded p-2" }, /* @__PURE__ */ React.createElement("div", { className: "text-gray-600" }, "Last (as\u2011of cutoff)"), /* @__PURE__ */ React.createElement("div", { className: "font-medium text-red-700" }, formatCurrency ? formatCurrency(remStats.last) : remStats.last.toFixed(2))), /* @__PURE__ */ React.createElement("div", { className: "bg-gray-50 border rounded p-2" }, /* @__PURE__ */ React.createElement("div", { className: "text-gray-600" }, "Ultimate"), /* @__PURE__ */ React.createElement("div", { className: "font-medium" }, formatCurrency ? formatCurrency(ultimateAdj) : ultimateAdj.toFixed(2)))))))), /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded border p-3 mt-4" }, /* @__PURE__ */ React.createElement("div", { className: "text-xs font-medium text-gray-700 mb-2" }, "Training Row (as\u2011of Dev Q", dispQ(cutoffDevQ), ")"), /* @__PURE__ */ React.createElement("div", { className: "overflow-auto" }, /* @__PURE__ */ React.createElement("table", { className: "w-full text-sm" }, /* @__PURE__ */ React.createElement("thead", { className: "bg-gray-50" }, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", { className: "px-3 py-2 text-left font-medium" }, "Feature"), /* @__PURE__ */ React.createElement("th", { className: "px-3 py-2 text-left font-medium" }, "Type"), /* @__PURE__ */ React.createElement("th", { className: "px-3 py-2 text-left font-medium" }, "Rule"), /* @__PURE__ */ React.createElement("th", { className: "px-3 py-2 text-right font-medium" }, "Value"))), /* @__PURE__ */ React.createElement("tbody", null, /* @__PURE__ */ React.createElement("tr", { className: "border-t" }, /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2 font-mono" }, "postcode_latest"), /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2" }, "Near\u2011static"), /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2" }, "Latest non\u2011missing \u2264 cutoff"), /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2 text-right font-mono" }, postcodeLatest ?? "NA")), /* @__PURE__ */ React.createElement("tr", { className: "border-t" }, /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2 font-mono" }, "legal_rep_latest"), /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2" }, "Near\u2011static"), /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2" }, "Latest non\u2011missing \u2264 cutoff"), /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2 text-right font-mono" }, legalRepLatest ?? "NA")), /* @__PURE__ */ React.createElement("tr", { className: "border-t" }, /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2 font-mono" }, "inc_paid_mean_q1..k"), /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2" }, "Time\u2011series"), /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2" }, "Mean of increments \u2264 cutoff"), /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2 text-right" }, formatCurrency ? formatCurrency(incStats.mean) : incStats.mean.toFixed(2))), /* @__PURE__ */ React.createElement("tr", { className: "border-t" }, /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2 font-mono" }, "inc_paid_max_q1..k"), /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2" }, "Time\u2011series"), /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2" }, "Max of increments \u2264 cutoff"), /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2 text-right" }, formatCurrency ? formatCurrency(incStats.max) : incStats.max.toFixed(2))), /* @__PURE__ */ React.createElement("tr", { className: "border-t" }, /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2 font-mono" }, "inc_paid_sd_q1..k"), /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2" }, "Time\u2011series"), /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2" }, "Std dev of increments \u2264 cutoff"), /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2 text-right" }, formatCurrency ? formatCurrency(incStats.sd) : incStats.sd.toFixed(2))), /* @__PURE__ */ React.createElement("tr", { className: "border-t" }, /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2 font-mono" }, "cum_paid_last_qk"), /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2" }, "Time\u2011series"), /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2" }, "Last observed \u2264 cutoff"), /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2 text-right" }, formatCurrency ? formatCurrency(cumStats.last) : cumStats.last.toFixed(2))), /* @__PURE__ */ React.createElement("tr", { className: "border-t" }, /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2 font-mono" }, "incurred_last_qk"), /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2" }, "Time\u2011series"), /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2" }, "Incurred (last observed \u2264 cutoff)"), /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2 text-right text-red-700" }, formatCurrency ? formatCurrency(remStats.last) : remStats.last.toFixed(2))), /* @__PURE__ */ React.createElement("tr", { className: "border-t-2 border-indigo-300 bg-indigo-50" }, /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2 font-mono font-bold" }, "outstanding_liability"), /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2 font-bold" }, "Target"), /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2" }, "Remaining at cutoff (actual)"), /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2 text-right font-bold text-indigo-900" }, formatCurrency ? formatCurrency(trueOutstandingStats.last) : trueOutstandingStats.last.toFixed(2))))))));
}
window.CovariateHistorySummaries = CovariateHistorySummaries;
