const U = window.utils;
const demoStart = /* @__PURE__ */ new Date("2020-01-01T00:00:00Z");
const demoEnd = /* @__PURE__ */ new Date("2025-01-01T00:00:00Z");
const demoSeed = U.hashStringToSeed("preprocessing-diagram");
const demoClaims = U.generateClaims({
  n: 20,
  startDate: demoStart,
  endDate: demoEnd,
  minDurDays: 180,
  maxDurDays: 1095,
  maxPartials: 20,
  seed: demoSeed,
  dedupeMonthly: true,
  observationEndDate: demoEnd
});
const demoPrice = U.generatePriceIndexSeries(demoStart, demoEnd, demoSeed);
const demoMidQuarter = U.buildMidQuarterIndexMap(demoPrice.map);
const claimStore = {
  state: {
    index: Math.max(
      0,
      demoClaims.findIndex((c) => c.staticCovariates.claimId === "CLM-0001")
    )
  },
  listeners: /* @__PURE__ */ new Set(),
  get: () => claimStore.state,
  set(patch) {
    claimStore.state = { ...claimStore.state, ...patch };
    claimStore.listeners.forEach((l) => l());
  },
  subscribe(l) {
    claimStore.listeners.add(l);
    return () => claimStore.listeners.delete(l);
  }
};
function useClaimIndex() {
  return React.useSyncExternalStore(claimStore.subscribe, claimStore.get).index;
}
function ClaimBar() {
  const index = useClaimIndex();
  const claim = demoClaims[index];
  const step = (d) => claimStore.set({ index: (index + d + demoClaims.length) % demoClaims.length });
  return /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between gap-4 mb-3 p-2 bg-white rounded border shadow-sm" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => step(-1),
      className: "px-3 py-1 rounded bg-white border border-gray-300 text-gray-700 hover:bg-gray-100"
    },
    "\u2190 Prev"
  ), /* @__PURE__ */ React.createElement("div", { className: "text-sm font-medium" }, "Claim ", index + 1, " of ", demoClaims.length, /* @__PURE__ */ React.createElement("span", { className: "text-gray-500 font-normal ml-2" }, "(", claim.staticCovariates.claimId, ")")), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => step(1),
      className: "px-3 py-1 rounded bg-white border border-gray-300 text-gray-700 hover:bg-gray-100"
    },
    "Next \u2192"
  ));
}
function LinkedDemo({ render }) {
  const index = useClaimIndex();
  const claim = demoClaims[index];
  const data = React.useMemo(
    () => U.aggregateClaimToQuarters(claim, true, demoEnd, demoPrice.map),
    [claim]
  );
  return /* @__PURE__ */ React.createElement("div", { className: "p-3" }, /* @__PURE__ */ React.createElement(ClaimBar, null), render(claim, data));
}
const demoMounts = [
  ["demo-claim", (claim, data) => /* @__PURE__ */ React.createElement("div", { className: "space-y-3" }, /* @__PURE__ */ React.createElement(StaticCovariates, { claimInfo: data.claimInfo }), /* @__PURE__ */ React.createElement(ContinuousTimeline, { claimInfo: data.claimInfo, selectedClaim: claim }))],
  ["demo-payments", (claim, data) => /* @__PURE__ */ React.createElement(
    PaymentDetails,
    {
      claimInfo: data.claimInfo,
      selectedClaim: claim,
      oneBasedDevQuarters: true
    }
  )],
  ["demo-quarterly", (claim, data) => /* @__PURE__ */ React.createElement(QuarterlyAggregation, { quarters: data.quarters })],
  ["demo-inflation", (claim, data) => /* @__PURE__ */ React.createElement(
    InflationAdjustment,
    {
      show: "tables",
      quarters: data.quarters,
      claimInfo: data.claimInfo,
      endDate: demoEnd,
      priceIndexMap: demoPrice.map,
      priceIndexSeries: demoPrice.series,
      midQuarterIndexMap: demoMidQuarter
    }
  )],
  ["demo-outstanding", (claim, data) => /* @__PURE__ */ React.createElement(
    OutstandingLiabilityCalculation,
    {
      quarters: data.quarters,
      claimInfo: data.claimInfo,
      endDate: demoEnd,
      priceIndexMap: demoPrice.map,
      midQuarterIndexMap: demoMidQuarter
    }
  )],
  ["demo-history", (claim, data) => /* @__PURE__ */ React.createElement(
    CovariateHistorySummaries,
    {
      claimData: data,
      endDate: demoEnd,
      priceIndexMap: demoPrice.map,
      midQuarterIndexMap: demoMidQuarter,
      oneBasedDevQuarters: true
    }
  )],
  ["demo-nn", (claim, data) => /* @__PURE__ */ React.createElement(
    NeuralNetworkPreprocessing,
    {
      claimData: data,
      endDate: demoEnd,
      priceIndexMap: demoPrice.map,
      midQuarterIndexMap: demoMidQuarter,
      oneBasedDevQuarters: true
    }
  )],
  ["demo-snapshots", (claim, data) => /* @__PURE__ */ React.createElement(
    DevelopmentPeriodGeneration,
    {
      claimInfo: data.claimInfo,
      quarters: data.quarters,
      endDate: demoEnd,
      oneBasedDevQuarters: true,
      priceIndexMap: demoPrice.map,
      midQuarterIndexMap: demoMidQuarter
    }
  )]
];
for (const [id, render] of demoMounts) {
  const el = document.getElementById(id);
  if (el) ReactDOM.createRoot(el).render(/* @__PURE__ */ React.createElement(LinkedDemo, { render }));
}
const inflPlotEl = document.getElementById("demo-inflation-plot");
if (inflPlotEl) ReactDOM.createRoot(inflPlotEl).render(
  /* @__PURE__ */ React.createElement("div", { className: "p-3" }, /* @__PURE__ */ React.createElement(
    InflationAdjustment,
    {
      show: "plot",
      quarters: [],
      claimInfo: null,
      endDate: demoEnd,
      priceIndexMap: demoPrice.map,
      priceIndexSeries: demoPrice.series,
      midQuarterIndexMap: demoMidQuarter
    }
  ))
);
const splitEl = document.getElementById("demo-splitting");
if (splitEl) ReactDOM.createRoot(splitEl).render(/* @__PURE__ */ React.createElement(ClaimsDiagram, null));
if (typeof Reveal !== "undefined" && Reveal.on) {
  Reveal.on("slidechanged", (e) => {
    try {
      e.currentSlide.querySelectorAll(".js-plotly-plot").forEach((el) => Plotly.Plots.resize(el));
    } catch (err) {
    }
  });
}
