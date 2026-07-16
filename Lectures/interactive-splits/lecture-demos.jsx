// Lecture-specific glue for individual-claim-reserving.qmd: shared demo
// data, the claim store that links every slide's Prev/Next bar, and one
// React mount per interactive slide. (The component .jsx files are verbatim
// copies of the webapp; this file is the only lecture-side code.)

// ---- Shared data: same deterministic inputs as the original webapp ----
const U = window.utils;
const demoStart = new Date("2020-01-01T00:00:00Z");
const demoEnd = new Date("2025-01-01T00:00:00Z");
const demoSeed = U.hashStringToSeed("preprocessing-diagram");
const demoClaims = U.generateClaims({
  n: 20, startDate: demoStart, endDate: demoEnd,
  minDurDays: 180, maxDurDays: 1095, maxPartials: 20,
  seed: demoSeed, dedupeMonthly: true, observationEndDate: demoEnd,
});
const demoPrice = U.generatePriceIndexSeries(demoStart, demoEnd, demoSeed);
const demoMidQuarter = U.buildMidQuarterIndexMap(demoPrice.map);

// ---- One claim index shared by every React root (one root per slide) ----
const claimStore = {
  state: {
    index: Math.max(
      0,
      demoClaims.findIndex((c) => c.staticCovariates.claimId === "CLM-0001")
    ),
  },
  listeners: new Set(),
  get: () => claimStore.state,
  set(patch) {
    claimStore.state = { ...claimStore.state, ...patch };
    claimStore.listeners.forEach((l) => l());
  },
  subscribe(l) {
    claimStore.listeners.add(l);
    return () => claimStore.listeners.delete(l);
  },
};

function useClaimIndex() {
  return React.useSyncExternalStore(claimStore.subscribe, claimStore.get).index;
}

function ClaimBar() {
  const index = useClaimIndex();
  const claim = demoClaims[index];
  const step = (d) =>
    claimStore.set({ index: (index + d + demoClaims.length) % demoClaims.length });
  return (
    <div className="flex items-center justify-between gap-4 mb-3 p-2 bg-white rounded border shadow-sm">
      <button
        onClick={() => step(-1)}
        className="px-3 py-1 rounded bg-white border border-gray-300 text-gray-700 hover:bg-gray-100"
      >
        ← Prev
      </button>
      <div className="text-sm font-medium">
        Claim {index + 1} of {demoClaims.length}
        <span className="text-gray-500 font-normal ml-2">
          ({claim.staticCovariates.claimId})
        </span>
      </div>
      <button
        onClick={() => step(1)}
        className="px-3 py-1 rounded bg-white border border-gray-300 text-gray-700 hover:bg-gray-100"
      >
        Next →
      </button>
    </div>
  );
}

// ---- Per-slide wrapper: derives the selected claim's quarterly data ----
function LinkedDemo({ render }) {
  const index = useClaimIndex();
  const claim = demoClaims[index];
  const data = React.useMemo(
    () => U.aggregateClaimToQuarters(claim, true, demoEnd, demoPrice.map),
    [claim]
  );
  return (
    <div className="p-3">
      <ClaimBar />
      {render(claim, data)}
    </div>
  );
}

// ---- One mount per interactive slide ----
const demoMounts = [
  // Intro slide ("Individual claim reserving"): the live version of the same
  // timeline the static images/individual-claim.png was a screenshot of —
  // just the ContinuousTimeline (no covariates table), steppable and synced
  // to the shared claim like every later demo.
  ["demo-claim-intro", (claim, data) => (
    <ContinuousTimeline claimInfo={data.claimInfo} selectedClaim={claim} />
  )],
  ["demo-claim", (claim, data) => (
    <div className="space-y-3">
      <StaticCovariates claimInfo={data.claimInfo} />
      <ContinuousTimeline claimInfo={data.claimInfo} selectedClaim={claim} />
    </div>
  )],
  ["demo-payments", (claim, data) => (
    <PaymentDetails
      claimInfo={data.claimInfo}
      selectedClaim={claim}
      oneBasedDevQuarters={true}
    />
  )],
  ["demo-quarterly", (claim, data) => <QuarterlyAggregation quarters={data.quarters} />],
  ["demo-inflation", (claim, data) => (
    <InflationAdjustment
      show="tables"
      quarters={data.quarters}
      claimInfo={data.claimInfo}
      endDate={demoEnd}
      priceIndexMap={demoPrice.map}
      priceIndexSeries={demoPrice.series}
      midQuarterIndexMap={demoMidQuarter}
    />
  )],
  ["demo-outstanding", (claim, data) => (
    <OutstandingLiabilityCalculation
      quarters={data.quarters}
      claimInfo={data.claimInfo}
      endDate={demoEnd}
      priceIndexMap={demoPrice.map}
      midQuarterIndexMap={demoMidQuarter}
    />
  )],
  // Split across two slides (the full component is ~2 slides tall): the
  // covariate-summary grid on one, the assembled training row on the next.
  ["demo-history", (claim, data) => (
    <CovariateHistorySummaries
      claimData={data}
      endDate={demoEnd}
      priceIndexMap={demoPrice.map}
      midQuarterIndexMap={demoMidQuarter}
      oneBasedDevQuarters={true}
      show="summaries"
    />
  )],
  ["demo-history-row", (claim, data) => (
    <CovariateHistorySummaries
      claimData={data}
      endDate={demoEnd}
      priceIndexMap={demoPrice.map}
      midQuarterIndexMap={demoMidQuarter}
      oneBasedDevQuarters={true}
      show="row"
    />
  )],
  ["demo-nn", (claim, data) => (
    <NeuralNetworkPreprocessing
      claimData={data}
      endDate={demoEnd}
      priceIndexMap={demoPrice.map}
      midQuarterIndexMap={demoMidQuarter}
      oneBasedDevQuarters={true}
    />
  )],
  ["demo-snapshots", (claim, data) => (
    <DevelopmentPeriodGeneration
      claimInfo={data.claimInfo}
      quarters={data.quarters}
      endDate={demoEnd}
      oneBasedDevQuarters={true}
      priceIndexMap={demoPrice.map}
      midQuarterIndexMap={demoMidQuarter}
    />
  )],
];
for (const [id, render] of demoMounts) {
  const el = document.getElementById(id);
  if (el) ReactDOM.createRoot(el).render(<LinkedDemo render={render} />);
}

// The price-index plot is claim-independent, so it mounts directly
// (no LinkedDemo/ClaimBar) — only the index series props matter here.
const inflPlotEl = document.getElementById("demo-inflation-plot");
if (inflPlotEl) ReactDOM.createRoot(inflPlotEl).render(
  <div className="p-3">
    <InflationAdjustment
      show="plot"
      quarters={[]}
      claimInfo={null}
      endDate={demoEnd}
      priceIndexMap={demoPrice.map}
      priceIndexSeries={demoPrice.series}
      midQuarterIndexMap={demoMidQuarter}
    />
  </div>
);

// The splitting diagram keeps its own internal state (cutoffs, split mode).
const splitEl = document.getElementById("demo-splitting");
if (splitEl) ReactDOM.createRoot(splitEl).render(<ClaimsDiagram />);

// Reveal hides inactive slides with display:none, so Plotly sparklines
// mounted there mis-measure their width; re-fit them when shown.
if (typeof Reveal !== "undefined" && Reveal.on) {
  Reveal.on("slidechanged", (e) => {
    try {
      e.currentSlide
        .querySelectorAll(".js-plotly-plot")
        .forEach((el) => Plotly.Plots.resize(el));
    } catch (err) {}
  });
}
