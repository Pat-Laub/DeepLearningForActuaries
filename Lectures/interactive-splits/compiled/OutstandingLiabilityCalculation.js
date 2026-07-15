function OutstandingLiabilityCalculation({
  quarters,
  claimInfo,
  endDate,
  priceIndexMap,
  midQuarterIndexMap
}) {
  const { getQuarterInfo, formatCurrency } = window.utils;
  const observationQuarterKey = getQuarterInfo(endDate, claimInfo.accidentDate).quarterKey;
  const targetPI = priceIndexMap ? priceIndexMap[observationQuarterKey] : null;
  const midMap = midQuarterIndexMap || {};
  const ultimateClaimSize = quarters.reduce((sum, q) => {
    const srcMid = midMap[q.quarterKey] || (priceIndexMap ? priceIndexMap[q.quarterKey] : null);
    const factor = targetPI && srcMid ? targetPI / srcMid : 1;
    return sum + (q.nominalAmount || q.totalAmount) * factor;
  }, 0);
  return /* @__PURE__ */ React.createElement("div", { className: "bg-green-50 p-4 rounded-lg" }, /* @__PURE__ */ React.createElement("div", { className: "text-sm mb-3" }, /* @__PURE__ */ React.createElement("strong", null, "Ultimate = Total Payments Over Claim Lifetime (adjusted to ", observationQuarterKey, ") = ", formatCurrency(ultimateClaimSize))), /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded border overflow-hidden" }, /* @__PURE__ */ React.createElement("table", { className: "w-full text-sm" }, /* @__PURE__ */ React.createElement("thead", { className: "bg-gray-50" }, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", { className: "px-3 py-2 text-left font-medium" }, "Quarter"), /* @__PURE__ */ React.createElement("th", { className: "px-3 py-2 text-right font-medium" }, "Cumulative Paid"), /* @__PURE__ */ React.createElement("th", { className: "px-3 py-2 text-right font-medium" }, "Outstanding Liability"))), /* @__PURE__ */ React.createElement("tbody", null, (() => {
    let cumulativeSum = 0;
    return quarters.map((quarter, i) => {
      const srcMid = midMap[quarter.quarterKey] || (priceIndexMap ? priceIndexMap[quarter.quarterKey] : null);
      const factor = targetPI && srcMid ? targetPI / srcMid : 1;
      const adjustedThisQuarter = (quarter.nominalAmount || quarter.totalAmount) * factor;
      cumulativeSum += adjustedThisQuarter;
      const outstandingLiability = Math.max(0, ultimateClaimSize - cumulativeSum);
      return /* @__PURE__ */ React.createElement("tr", { key: i, className: "border-t border-gray-100" }, /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2 font-mono" }, "Dev Q", quarter.developmentQuarter), /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2 text-right font-medium" }, formatCurrency(cumulativeSum)), /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2 text-right font-medium" }, formatCurrency(outstandingLiability)));
    });
  })()))), /* @__PURE__ */ React.createElement("div", { className: "text-xs text-gray-600 mt-2" }, "True outstanding = ", /* @__PURE__ */ React.createElement("span", { className: "font-mono" }, "Ultimate"), " \u2212 ", /* @__PURE__ */ React.createElement("span", { className: "font-mono" }, "CumulativePaidToDate")));
}
window.OutstandingLiabilityCalculation = OutstandingLiabilityCalculation;
