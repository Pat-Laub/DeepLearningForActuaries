function NeuralNetworkPreprocessing({
  claimData,
  endDate,
  priceIndexMap,
  midQuarterIndexMap,
  oneBasedDevQuarters
}) {
  const { formatCurrency, getQuarterInfo } = window.utils;
  if (!claimData || !claimData.quarters || !Array.isArray(claimData.quarters) || !claimData.claimInfo) {
    return null;
  }
  const { claimInfo, quarters } = claimData;
  const devQs = (quarters || []).map((q) => q.developmentQuarter);
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
  const postcodeHistory = [];
  const legalRepHistory = [];
  const adjustedIncrements = [];
  const cumulativeAdj = [];
  let runningTotal = 0;
  for (const q of quarters) {
    if (q.postcode !== null && q.postcode !== void 0) {
      postcodeHistory.push({ devQ: q.developmentQuarter, value: q.postcode });
    }
    if (q.legalRep !== null && q.legalRep !== void 0) {
      legalRepHistory.push({ devQ: q.developmentQuarter, value: q.legalRep });
    }
    const observationQuarter = getQuarterInfo(endDate, claimInfo.accidentDate);
    const targetPI = priceIndexMap ? priceIndexMap[observationQuarter.quarterKey] : null;
    const midMap = midQuarterIndexMap || {};
    const srcMid = midMap[q.quarterKey] || (priceIndexMap ? priceIndexMap[q.quarterKey] : null);
    const factor = targetPI && srcMid ? targetPI / srcMid : 1;
    const adjIncrement = (q.nominalAmount || q.totalAmount) * factor;
    adjustedIncrements.push(adjIncrement);
    runningTotal += adjIncrement;
    cumulativeAdj.push(runningTotal);
  }
  const ultimateAdj = adjustedIncrements.reduce((sum, val) => sum + val, 0);
  const cutoff = Math.max(minDevQ, Math.min(maxDevQ, cutoffDevQ));
  const postcodeLatest = [...postcodeHistory].reverse().find((x) => x.devQ <= cutoff)?.value;
  const legalRepLatest = [...legalRepHistory].reverse().find((x) => x.devQ <= cutoff)?.value;
  const incUpToCutoff = adjustedIncrements.filter((_, i) => quarters[i].developmentQuarter <= cutoff);
  const incStats = {
    mean: incUpToCutoff.length > 0 ? incUpToCutoff.reduce((a, b) => a + b, 0) / incUpToCutoff.length : 0,
    max: incUpToCutoff.length > 0 ? Math.max(...incUpToCutoff) : 0,
    sd: incUpToCutoff.length > 1 ? Math.sqrt(incUpToCutoff.reduce((sum, val) => sum + Math.pow(val - incUpToCutoff.reduce((a, b) => a + b, 0) / incUpToCutoff.length, 2), 0) / incUpToCutoff.length) : 0
  };
  const cumUpToCutoff = cumulativeAdj.filter((_, i) => quarters[i].developmentQuarter <= cutoff);
  const cumStats = {
    last: cumUpToCutoff.length > 0 ? cumUpToCutoff[cumUpToCutoff.length - 1] : 0
  };
  const trueOutstanding = cumulativeAdj.map((c) => Math.max(0, ultimateAdj - c));
  const mulberry32 = (a) => {
    return function() {
      let t = a += 1831565813;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  };
  const claimIdNum = parseInt(claimInfo.claimId.replace(/\D/g, ""), 10) || 1;
  const remainingAdj = trueOutstanding.map((trueVal, i) => {
    const progress = (i + 1) / Math.max(1, trueOutstanding.length);
    const baseErrorPct = 0.25 * (1 - progress * 0.7);
    const rng = mulberry32(claimIdNum * 1e3 + i);
    const errorFactor = 1 + baseErrorPct * (2 * rng() - 1);
    return Math.max(0, trueVal * errorFactor);
  });
  const remUpToCutoff = remainingAdj.filter((_, i) => quarters[i].developmentQuarter <= cutoff);
  const remStats = {
    last: remUpToCutoff.length > 0 ? remUpToCutoff[remUpToCutoff.length - 1] : 0
  };
  const trueOutstandingStats = {
    last: trueOutstanding.filter((_, i) => quarters[i].developmentQuarter <= cutoff).slice(-1)[0] || 0
  };
  const log1p = (x) => Math.log(1 + x);
  const cutoffQuarterKey = quarters.find((q) => q.developmentQuarter === cutoff)?.quarterKey;
  return /* @__PURE__ */ React.createElement("div", { className: "mb-4 p-4 bg-teal-50 rounded-lg border border-teal-200" }, /* @__PURE__ */ React.createElement("div", { className: "text-sm text-teal-800 space-y-3" }, /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded border p-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col md:flex-row md:items-center md:gap-4" }, /* @__PURE__ */ React.createElement("div", { className: "text-xs font-medium text-gray-700 mb-2 md:mb-0" }, "Choose valuation quarter:"), /* @__PURE__ */ React.createElement("div", { className: "flex-1 flex items-center gap-3" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs text-gray-600 font-mono" }, "Dev Q", dispQ(minDevQ)), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "range",
      min: minDevQ,
      max: maxDevQ,
      value: cutoff,
      onChange: (e) => setCutoffDevQ(parseInt(e.target.value, 10)),
      className: "w-full"
    }
  ), /* @__PURE__ */ React.createElement("span", { className: "text-xs text-gray-600 font-mono" }, "Dev Q", dispQ(maxDevQ))), /* @__PURE__ */ React.createElement("div", { className: "text-xs text-gray-700" }, /* @__PURE__ */ React.createElement("span", { className: "font-mono bg-teal-100 px-1 rounded mr-1" }, "Valuation: Dev Q", dispQ(cutoff)), /* @__PURE__ */ React.createElement("span", { className: "font-mono bg-gray-100 px-1 rounded" }, cutoffQuarterKey || "-")))), /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded border p-3" }, /* @__PURE__ */ React.createElement("div", { className: "text-xs font-medium text-gray-700 mb-2" }, "Training Row with Log-Transformed Dollar Features"), /* @__PURE__ */ React.createElement("div", { className: "overflow-auto" }, /* @__PURE__ */ React.createElement("table", { className: "w-full text-sm" }, /* @__PURE__ */ React.createElement("thead", { className: "bg-gray-50" }, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", { className: "px-3 py-2 text-left font-medium" }, "Feature"), /* @__PURE__ */ React.createElement("th", { className: "px-3 py-2 text-left font-medium" }, "Original Value"), /* @__PURE__ */ React.createElement("th", { className: "px-3 py-2 text-right font-medium" }, "log(1 + x)"))), /* @__PURE__ */ React.createElement("tbody", null, /* @__PURE__ */ React.createElement("tr", { className: "border-t" }, /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2 font-mono" }, "postcode_latest"), /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2 text-gray-500 italic", colSpan: "2" }, "(categorical - will be one-hot encoded)")), /* @__PURE__ */ React.createElement("tr", { className: "border-t" }, /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2 font-mono" }, "legal_rep_latest"), /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2 text-gray-500 italic", colSpan: "2" }, "(categorical - will be one-hot encoded)")), /* @__PURE__ */ React.createElement("tr", { className: "border-t" }, /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2 font-mono" }, "inc_paid_mean_q1..k"), /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2" }, formatCurrency(incStats.mean)), /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2 text-right font-mono text-teal-700" }, log1p(incStats.mean).toFixed(4))), /* @__PURE__ */ React.createElement("tr", { className: "border-t" }, /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2 font-mono" }, "inc_paid_max_q1..k"), /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2" }, formatCurrency(incStats.max)), /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2 text-right font-mono text-teal-700" }, log1p(incStats.max).toFixed(4))), /* @__PURE__ */ React.createElement("tr", { className: "border-t" }, /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2 font-mono" }, "inc_paid_sd_q1..k"), /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2" }, formatCurrency(incStats.sd)), /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2 text-right font-mono text-teal-700" }, log1p(incStats.sd).toFixed(4))), /* @__PURE__ */ React.createElement("tr", { className: "border-t" }, /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2 font-mono" }, "cum_paid_last_qk"), /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2" }, formatCurrency(cumStats.last)), /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2 text-right font-mono text-teal-700" }, log1p(cumStats.last).toFixed(4))), /* @__PURE__ */ React.createElement("tr", { className: "border-t" }, /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2 font-mono" }, "case_estimate"), /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2 text-red-700" }, formatCurrency(remStats.last)), /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2 text-right font-mono text-teal-700" }, log1p(remStats.last).toFixed(4))), /* @__PURE__ */ React.createElement("tr", { className: "border-t-2 border-indigo-300 bg-indigo-50" }, /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2 font-mono font-bold" }, "outstanding"), /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2 font-bold text-indigo-700", colSpan: "2" }, formatCurrency(trueOutstandingStats.last)))))))));
}
window.NeuralNetworkPreprocessing = NeuralNetworkPreprocessing;
