function DevelopmentPeriodGeneration({
  claimInfo,
  quarters,
  endDate,
  oneBasedDevQuarters,
  priceIndexMap,
  midQuarterIndexMap
}) {
  const { getQuarterInfo, formatCurrency } = window.utils;
  return /* @__PURE__ */ React.createElement("div", { className: "bg-purple-50 p-4 rounded-lg border border-purple-200" }, (() => {
    const notifyQuarter = getQuarterInfo(claimInfo.notifyDate, claimInfo.accidentDate).developmentQuarter;
    const finalisationQuarter = getQuarterInfo(claimInfo.finalisationDate, claimInfo.accidentDate).developmentQuarter;
    const observationQuarter = getQuarterInfo(endDate, claimInfo.accidentDate).developmentQuarter;
    const maxObservableQuarter = Math.min(finalisationQuarter, observationQuarter);
    const validNumRows = Math.max(0, maxObservableQuarter - notifyQuarter + 1);
    const svgHeight = 40 + validNumRows * 25;
    const startY = 35;
    const rowHeight = 15;
    const totalWidth = 560;
    return /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, /* @__PURE__ */ React.createElement("div", { className: "bg-gray-50 p-3 rounded" }, /* @__PURE__ */ React.createElement("div", { className: "text-xs font-medium mb-2" }, "Claim ", claimInfo.claimId, " \u2192 ", validNumRows, " Training Rows:"), /* @__PURE__ */ React.createElement("svg", { width: "100%", height: svgHeight, className: "border rounded bg-white" }, /* @__PURE__ */ React.createElement("rect", { x: "20", y: "10", width: "560", height: "15", fill: "#E5E7EB", stroke: "#9CA3AF", strokeWidth: "1", rx: "2" }), /* @__PURE__ */ React.createElement("text", { x: "25", y: "21", fontSize: "10", fill: "#374151", fontWeight: "bold" }, "Original Claim ", claimInfo.claimId), /* @__PURE__ */ React.createElement("text", { x: "450", y: "21", fontSize: "9", fill: "#6B7280" }, "Notify Q", notifyQuarter, " \u2192 Settle Q", finalisationQuarter), Array.from({ length: validNumRows }, (_, i) => {
      const y = startY + i * 25;
      const currentQuarter = notifyQuarter + i;
      const isLastObservableRow = currentQuarter === maxObservableQuarter;
      const totalQuarters = finalisationQuarter - notifyQuarter + 1;
      const observedQuarters = currentQuarter - notifyQuarter + 1;
      const cutoffWidth = observedQuarters / totalQuarters * totalWidth;
      return /* @__PURE__ */ React.createElement("g", { key: i }, /* @__PURE__ */ React.createElement(
        "rect",
        {
          x: "20",
          y,
          width: totalWidth,
          height: rowHeight,
          fill: "#FEF3C7",
          stroke: "#F59E0B",
          strokeWidth: "1",
          rx: "2",
          opacity: "0.3"
        }
      ), (() => {
        const observationQuarter2 = getQuarterInfo(endDate, claimInfo.accidentDate);
        const targetQuarterKey = observationQuarter2.quarterKey;
        const targetPI = priceIndexMap ? priceIndexMap[targetQuarterKey] : null;
        const midMap = midQuarterIndexMap || {};
        const ultimateClaimSize = quarters.reduce((sum, q) => {
          const srcMid = midMap[q.quarterKey] || (priceIndexMap ? priceIndexMap[q.quarterKey] : null);
          const factor = targetPI && srcMid ? targetPI / srcMid : 1;
          return sum + (q.nominalAmount || q.totalAmount) * factor;
        }, 0);
        let cumulativeToDate = 0;
        for (let qIdx = 0; qIdx < quarters.length; qIdx++) {
          const q = quarters[qIdx];
          if (q.developmentQuarter <= currentQuarter) {
            const srcMid = midMap[q.quarterKey] || (priceIndexMap ? priceIndexMap[q.quarterKey] : null);
            const factor = targetPI && srcMid ? targetPI / srcMid : 1;
            cumulativeToDate += (q.nominalAmount || q.totalAmount) * factor;
          }
        }
        const outstandingLiability = Math.max(0, ultimateClaimSize - cumulativeToDate);
        const isZeroTarget = Math.round(outstandingLiability * 100) === 0;
        const fillColor = isZeroTarget ? "#FEE2E2" : "#DBEAFE";
        return /* @__PURE__ */ React.createElement(
          "rect",
          {
            x: "20",
            y,
            width: cutoffWidth,
            height: rowHeight,
            fill: fillColor,
            stroke: "#3B82F6",
            strokeWidth: "1",
            rx: "2"
          }
        );
      })(), /* @__PURE__ */ React.createElement("text", { x: "25", y: y + 11, fontSize: "9", fill: "#374151", fontWeight: "medium" }, "Row ", i + 1, ": Observe to Dev Q", currentQuarter), /* @__PURE__ */ React.createElement("text", { x: 20 + cutoffWidth - 5, y: y + 11, fontSize: "8", fill: "#1F2937", textAnchor: "end", fontWeight: "bold" }, (() => {
        const observationQuarter2 = getQuarterInfo(endDate, claimInfo.accidentDate);
        const targetPI = priceIndexMap ? priceIndexMap[observationQuarter2.quarterKey] : null;
        const midMap = midQuarterIndexMap || {};
        const ultimateClaimSize = quarters.reduce((sum, q) => {
          const srcMid = midMap[q.quarterKey] || (priceIndexMap ? priceIndexMap[q.quarterKey] : null);
          const factor = targetPI && srcMid ? targetPI / srcMid : 1;
          return sum + (q.nominalAmount || q.totalAmount) * factor;
        }, 0);
        let cumulativeToDate = 0;
        for (let qIdx = 0; qIdx < quarters.length; qIdx++) {
          const q = quarters[qIdx];
          if (q.developmentQuarter <= currentQuarter) {
            const srcMid = midMap[q.quarterKey] || (priceIndexMap ? priceIndexMap[q.quarterKey] : null);
            const factor = targetPI && srcMid ? targetPI / srcMid : 1;
            cumulativeToDate += (q.nominalAmount || q.totalAmount) * factor;
          }
        }
        const outstandingLiability = Math.max(0, ultimateClaimSize - cumulativeToDate);
        return `Target: ${formatCurrency(outstandingLiability)}`;
      })()), /* @__PURE__ */ React.createElement(
        "line",
        {
          x1: 20 + cutoffWidth,
          y1: y,
          x2: 20 + cutoffWidth,
          y2: y + rowHeight,
          stroke: "#DC2626",
          strokeWidth: "2"
        }
      ));
    }))), /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded border overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700" }, "Training Rows Generated"), /* @__PURE__ */ React.createElement("div", { className: "max-h-60 overflow-auto" }, /* @__PURE__ */ React.createElement("table", { className: "w-full text-sm" }, /* @__PURE__ */ React.createElement("thead", { className: "bg-gray-50 sticky top-0" }, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", { className: "px-3 py-2 text-left font-medium" }, "Row"), /* @__PURE__ */ React.createElement("th", { className: "px-3 py-2 text-left font-medium" }, "Description"), /* @__PURE__ */ React.createElement("th", { className: "px-3 py-2 text-right font-medium" }, "Total Paid to Date"), /* @__PURE__ */ React.createElement("th", { className: "px-3 py-2 text-right font-medium" }, "Outstanding Liability"))), /* @__PURE__ */ React.createElement("tbody", null, Array.from({ length: validNumRows }, (_, i) => {
      const currentQuarter = notifyQuarter + i;
      const devPeriod = oneBasedDevQuarters ? currentQuarter + 1 : currentQuarter;
      const observationQuarter2 = getQuarterInfo(endDate, claimInfo.accidentDate);
      const targetPI = priceIndexMap ? priceIndexMap[observationQuarter2.quarterKey] : null;
      const midMap = midQuarterIndexMap || {};
      const ultimateClaimSize = quarters.reduce((sum, q) => {
        const srcMid = midMap[q.quarterKey] || (priceIndexMap ? priceIndexMap[q.quarterKey] : null);
        const factor = targetPI && srcMid ? targetPI / srcMid : 1;
        return sum + (q.nominalAmount || q.totalAmount) * factor;
      }, 0);
      let cumulativeToDate = 0;
      for (let qIdx = 0; qIdx < quarters.length; qIdx++) {
        const q = quarters[qIdx];
        if (q.developmentQuarter <= currentQuarter) {
          const srcMid = midMap[q.quarterKey] || (priceIndexMap ? priceIndexMap[q.quarterKey] : null);
          const factor = targetPI && srcMid ? targetPI / srcMid : 1;
          cumulativeToDate += (q.nominalAmount || q.totalAmount) * factor;
        }
      }
      const outstandingLiability = Math.max(0, ultimateClaimSize - cumulativeToDate);
      return /* @__PURE__ */ React.createElement("tr", { key: i, className: "border-t border-gray-100" }, /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2 text-left" }, /* @__PURE__ */ React.createElement("span", { className: "font-mono bg-blue-100 px-2 py-1 rounded text-blue-800 text-xs" }, "R", i + 1)), /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2 text-left text-xs" }, "Claim ", claimInfo.claimId, " at Dev Period ", devPeriod), /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2 text-right text-gray-600" }, formatCurrency(cumulativeToDate)), /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2 text-right font-medium text-red-700" }, formatCurrency(outstandingLiability)));
    }))))));
  })());
}
window.DevelopmentPeriodGeneration = DevelopmentPeriodGeneration;
