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
  const { getQuarterInfo, formatCurrency } = window.utils;
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
    const last = priceIndexSeries[priceIndexSeries.length - 1];
    if (last && priceIndexMap[last.quarterKey] != null) {
      m[last.quarterKey] = priceIndexMap[last.quarterKey];
    }
    return m;
  }, [priceIndexSeries, priceIndexMap]);
  return /* @__PURE__ */ React.createElement("div", { className: "bg-orange-50 p-4 rounded-lg border border-orange-200" }, show !== "tables" && /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded border p-3 mb-4" }, /* @__PURE__ */ React.createElement("div", { className: "text-xs font-medium text-gray-700 mb-2" }, "WPI: Quarter vs End\u2011of\u2011Quarter"), (() => {
    if (!priceIndexSeries || priceIndexSeries.length === 0) return /* @__PURE__ */ React.createElement("div", { className: "text-xs text-gray-500" }, "No index data.");
    const w = 720, h = 180, pad = 32;
    const quarterSeries = priceIndexSeries.map((p) => ({ quarterKey: p.quarterKey, index: priceIndexMap[p.quarterKey] ?? p.index }));
    const eoqSeries = priceIndexSeries.map((p) => ({ quarterKey: p.quarterKey, index: (eoqIndexMap && eoqIndexMap[p.quarterKey]) ?? priceIndexMap[p.quarterKey] ?? p.index }));
    const minY = Math.min(Math.min(...quarterSeries.map((p) => p.index)), Math.min(...eoqSeries.map((p) => p.index))) * 0.98;
    const maxY = Math.max(Math.max(...quarterSeries.map((p) => p.index)), Math.max(...eoqSeries.map((p) => p.index))) * 1.02;
    const n = quarterSeries.length;
    const xScale = (i) => pad + i / (n - 1) * (w - 2 * pad);
    const yScale = (v) => h - pad - (v - minY) / (maxY - minY) * (h - 2 * pad);
    const linePath = quarterSeries.map((p, i) => `${i === 0 ? "M" : "L"} ${xScale(i)} ${yScale(p.index)}`).join(" ");
    return /* @__PURE__ */ React.createElement("svg", { width: "100%", viewBox: `0 0 ${w} ${h}` }, /* @__PURE__ */ React.createElement("rect", { x: "0", y: "0", width: w, height: h, fill: "#ffffff" }), /* @__PURE__ */ React.createElement("path", { d: linePath, fill: "none", stroke: "#f59e0b", strokeWidth: "2" }), eoqSeries.map((p, i) => /* @__PURE__ */ React.createElement("circle", { key: i, cx: xScale(i), cy: yScale(p.index), r: "2.5", fill: "#1d4ed8" })), /* @__PURE__ */ React.createElement("line", { x1: pad, y1: h - pad, x2: w - pad, y2: h - pad, stroke: "#e5e7eb" }), /* @__PURE__ */ React.createElement("line", { x1: pad, y1: pad, x2: pad, y2: h - pad, stroke: "#e5e7eb" }), /* @__PURE__ */ React.createElement("text", { x: pad, y: pad - 8, fontSize: "10", fill: "#6b7280" }, "Index"), /* @__PURE__ */ React.createElement("text", { x: pad, y: h - 8, fontSize: "10", fill: "#6b7280" }, priceIndexSeries[0].quarterKey), /* @__PURE__ */ React.createElement("text", { x: w - pad, y: h - 8, fontSize: "10", textAnchor: "end", fill: "#6b7280" }, priceIndexSeries[priceIndexSeries.length - 1].quarterKey), /* @__PURE__ */ React.createElement("text", { x: w - pad, y: pad, fontSize: "10", textAnchor: "end", fill: "#6b7280" }, "Orange: Quarter w(t) \u2022 Blue: EOQ w[t]"));
  })()), show !== "plot" && /* @__PURE__ */ React.createElement("div", { className: "grid md:grid-cols-2 gap-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "text-xs font-medium text-orange-800 mb-2" }, "Quarter & EOQ values and adjustment factors"), /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded border overflow-hidden" }, /* @__PURE__ */ React.createElement("table", { className: "w-full text-xs" }, /* @__PURE__ */ React.createElement("thead", { className: "bg-gray-50" }, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", { className: "px-2 py-1 text-left font-medium" }, "Source Quarter"), /* @__PURE__ */ React.createElement("th", { className: "px-2 py-1 text-right font-medium" }, "w(t) source"), /* @__PURE__ */ React.createElement("th", { className: "px-2 py-1 text-right font-medium" }, "w[t] source"), /* @__PURE__ */ React.createElement("th", { className: "px-2 py-1 text-left font-medium" }, "Target Quarter"), /* @__PURE__ */ React.createElement("th", { className: "px-2 py-1 text-right font-medium" }, "w[T] target"), /* @__PURE__ */ React.createElement("th", { className: "px-2 py-1 text-right font-medium" }, "Payments: w[T]/w(t)"), /* @__PURE__ */ React.createElement("th", { className: "px-2 py-1 text-right font-medium" }, "Case est.: w[T]/w[t]"))), /* @__PURE__ */ React.createElement("tbody", null, (() => {
    const usedQs = [...new Set(quarters.map((q) => q.quarterKey))].sort();
    const targetQuarterKey = getQuarterInfo(endDate, claimInfo.accidentDate).quarterKey;
    const targetEOQ = eoqIndexMap ? eoqIndexMap[targetQuarterKey] : null;
    return usedQs.map((qk, i) => {
      const srcQuarter = priceIndexMap ? priceIndexMap[qk] : null;
      const srcEOQ = eoqIndexMap ? eoqIndexMap[qk] : srcQuarter ?? null;
      const payFactor = srcQuarter && targetEOQ ? targetEOQ / srcQuarter : 1;
      const caseFactor = srcEOQ && targetEOQ ? targetEOQ / srcEOQ : 1;
      return /* @__PURE__ */ React.createElement("tr", { key: i, className: "border-t border-gray-100" }, /* @__PURE__ */ React.createElement("td", { className: "px-2 py-1 font-mono" }, qk), /* @__PURE__ */ React.createElement("td", { className: "px-2 py-1 text-right font-mono" }, srcQuarter ? srcQuarter.toFixed(2) : "-"), /* @__PURE__ */ React.createElement("td", { className: "px-2 py-1 text-right font-mono" }, srcEOQ ? srcEOQ.toFixed(2) : "-"), /* @__PURE__ */ React.createElement("td", { className: "px-2 py-1 font-mono" }, targetQuarterKey), /* @__PURE__ */ React.createElement("td", { className: "px-2 py-1 text-right font-mono" }, targetEOQ ? targetEOQ.toFixed(2) : "-"), /* @__PURE__ */ React.createElement("td", { className: "px-2 py-1 text-right font-mono" }, payFactor.toFixed(4)), /* @__PURE__ */ React.createElement("td", { className: "px-2 py-1 text-right font-mono" }, caseFactor.toFixed(4)));
    });
  })())))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "text-xs font-medium text-orange-800 mb-2" }, "Quarter-Level Adjustments"), /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded border overflow-hidden" }, /* @__PURE__ */ React.createElement("table", { className: "w-full text-sm" }, /* @__PURE__ */ React.createElement("thead", { className: "bg-gray-50" }, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", { className: "px-3 py-2 text-left font-medium" }, "Dev Quarter"), /* @__PURE__ */ React.createElement("th", { className: "px-3 py-2 text-left font-medium" }, "Calendar Quarter"), /* @__PURE__ */ React.createElement("th", { className: "px-3 py-2 text-right font-medium" }, "Nominal Sum"), /* @__PURE__ */ React.createElement("th", { className: "px-3 py-2 text-right font-medium" }, "Adj Factor"), /* @__PURE__ */ React.createElement("th", { className: "px-3 py-2 text-right font-medium" }, "Adjusted Sum"))), /* @__PURE__ */ React.createElement("tbody", null, quarters.map((quarter, i) => {
    const calendarQuarterKey = quarter.quarterKey;
    const targetQuarterKey = getQuarterInfo(endDate, claimInfo.accidentDate).quarterKey;
    const targetEOQ = eoqIndexMap ? eoqIndexMap[targetQuarterKey] : null;
    const srcQuarter = priceIndexMap ? priceIndexMap[calendarQuarterKey] : null;
    const displayFactor = srcQuarter && targetEOQ ? targetEOQ / srcQuarter : 1;
    const adjustedSum = (quarter.nominalAmount || quarter.totalAmount) * displayFactor;
    if (quarter.paymentCount === 0) {
      return /* @__PURE__ */ React.createElement("tr", { key: i, className: "border-t border-gray-100 opacity-60" }, /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2 font-mono" }, "Dev Q", quarter.developmentQuarter), /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2 font-mono" }, calendarQuarterKey), /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2 text-right font-medium" }, formatCurrency(quarter.nominalAmount)), /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2 text-right text-gray-600 font-mono" }, "-"), /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2 text-right font-medium text-orange-700" }, formatCurrency(quarter.nominalAmount)));
    }
    return /* @__PURE__ */ React.createElement("tr", { key: i, className: "border-t border-gray-100" }, /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2 font-mono" }, "Dev Q", quarter.developmentQuarter), /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2 font-mono" }, calendarQuarterKey), /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2 text-right font-medium" }, formatCurrency(quarter.nominalAmount)), /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2 text-right text-gray-600 font-mono" }, displayFactor.toFixed(4)), /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2 text-right font-medium text-orange-700" }, formatCurrency(adjustedSum)));
  })))))));
}
window.InflationAdjustment = InflationAdjustment;
