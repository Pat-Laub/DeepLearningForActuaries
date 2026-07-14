function hashStringToSeed(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(a) {
  return function() {
    let t = a += 1831565813;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const MS_PER_DAY = 864e5;
const toISODate = (d) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString().slice(0, 10);
function clampDate(d, min, max) {
  const t = d.getTime();
  return new Date(Math.min(Math.max(t, min.getTime()), max.getTime()));
}
function addDays(d, days) {
  return new Date(d.getTime() + days * MS_PER_DAY);
}
function daysBetween(a, b) {
  return Math.round((b.getTime() - a.getTime()) / MS_PER_DAY);
}
function parseMaybeDate(value, baseStart) {
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d;
  }
  if (typeof value === "number" && baseStart instanceof Date) {
    return addDays(baseStart, value);
  }
  return null;
}
function monthKeyUTC(d) {
  return d.getUTCFullYear() * 12 + d.getUTCMonth();
}
function dedupeByCalendarMonth(dates) {
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  for (const d of dates) {
    const key = monthKeyUTC(d);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(d);
  }
  return out;
}
function startOfMonthUTC(d) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}
function addMonthsUTC(d, n) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
}
function generateSmartTicks(start, end, maxTicks = 10) {
  const spanDays = daysBetween(start, end);
  const ticks = [];
  maxTicks = Math.max(2, Math.floor(maxTicks));
  if (spanDays > 365 * 3) {
    const startY = start.getUTCFullYear();
    const endY = end.getUTCFullYear();
    const totalYears = endY - startY + 1;
    const stepY = Math.max(1, Math.ceil(totalYears / maxTicks));
    for (let y = startY; y <= endY; y += stepY) {
      ticks.push(new Date(Date.UTC(y, 0, 1)));
    }
  } else {
    const s0 = startOfMonthUTC(start);
    const e0 = startOfMonthUTC(end);
    const monthsSpan = (e0.getUTCFullYear() - s0.getUTCFullYear()) * 12 + (e0.getUTCMonth() - s0.getUTCMonth()) + 1;
    const stepM = Math.max(1, Math.ceil(monthsSpan / maxTicks));
    for (let m = 0; ; m += stepM) {
      const t = addMonthsUTC(s0, m);
      if (t > end) break;
      ticks.push(t);
    }
  }
  return ticks;
}
function generateClaims({
  n = 20,
  startDate,
  endDate,
  minDurDays = 30,
  maxDurDays = 300,
  maxPartials = 3,
  seed = 1,
  dedupeMonthly = true
}) {
  const rand = mulberry32(seed);
  const claims = [];
  const totalDays = Math.max(1, daysBetween(startDate, endDate));
  const latestNotify = Math.max(0, totalDays - minDurDays);
  const postcodes = ["2000", "3000", "4000", "5000", "6000", "7000", "1000"];
  const claimTypes = ["Motor", "Property", "Liability", "Workers Comp"];
  const regions = ["Metro", "Regional", "Remote"];
  for (let i = 0; i < n; i++) {
    const notifyDays = Math.floor(rand() * latestNotify);
    const notify = addDays(startDate, notifyDays);
    const remainingDays = daysBetween(notify, endDate);
    const maxDur = Math.min(maxDurDays, remainingDays);
    const durDays = Math.max(minDurDays, Math.floor(rand() * maxDur));
    const finalisation = addDays(notify, durDays);
    const numPartials = Math.floor(rand() * (maxPartials + 1));
    const partialDates = [];
    for (let j = 0; j < numPartials; j++) {
      const partialDays = Math.floor(rand() * durDays);
      partialDates.push(addDays(notify, partialDays));
    }
    partialDates.sort((a, b) => a.getTime() - b.getTime());
    const amounts = [];
    let totalAmount = 1e4 + rand() * 9e4;
    let remainingAmount = totalAmount;
    for (let j = 0; j < numPartials; j++) {
      const partialAmount = remainingAmount * (0.1 + rand() * 0.3);
      amounts.push(partialAmount);
      remainingAmount -= partialAmount;
    }
    amounts.push(remainingAmount);
    const payments = [];
    for (let j = 0; j < partialDates.length; j++) {
      payments.push({
        date: partialDates[j],
        amount: amounts[j]
      });
    }
    payments.push({
      date: finalisation,
      amount: amounts[amounts.length - 1]
    });
    const maxAccidentLag = 365;
    const accidentLagDays = Math.floor(rand() * maxAccidentLag);
    const accident = addDays(notify, -accidentLagDays);
    const claim = {
      accident,
      notify,
      finalisation,
      partials: dedupeMonthly ? dedupeByCalendarMonth(partialDates) : partialDates,
      payments,
      staticCovariates: {
        claimId: `CL${String(i + 1).padStart(4, "0")}`,
        postcode: postcodes[Math.floor(rand() * postcodes.length)],
        claimType: claimTypes[Math.floor(rand() * claimTypes.length)],
        region: regions[Math.floor(rand() * regions.length)],
        policyYear: accident.getUTCFullYear(),
        totalAmount
      }
    };
    claims.push(claim);
  }
  claims.sort((a, b) => a.notify.getTime() - b.notify.getTime());
  return claims;
}
function XMark({ x, y, size = 6, strokeWidth = 2, color = "currentColor", opacity = 1 }) {
  return /* @__PURE__ */ React.createElement("g", { opacity }, /* @__PURE__ */ React.createElement("line", { x1: x - size, y1: y - size, x2: x + size, y2: y + size, strokeWidth, stroke: color }), /* @__PURE__ */ React.createElement("line", { x1: x - size, y1: y + size, x2: x + size, y2: y - size, strokeWidth, stroke: color }));
}
function SquareMark({ x, y, size = 8, strokeWidth = 2, color = "currentColor" }) {
  const half = size / 2;
  return /* @__PURE__ */ React.createElement("rect", { x: x - half, y: y - half, width: size, height: size, fill: "white", stroke: color, strokeWidth });
}
function ClaimsDiagram() {
  const { useState, useMemo, useRef, useEffect } = React;
  const [numClaims, setNumClaims] = useState(20);
  const [startDateStr, setStartDateStr] = useState("2020-01-01");
  const [endDateStr, setEndDateStr] = useState("2025-01-01");
  const [minDurDays, setMinDurDays] = useState(180);
  const [maxDurDays, setMaxDurDays] = useState(1095);
  const [maxPartials, setMaxPartials] = useState(20);
  const [seedText, setSeedText] = useState("insurer-diagram");
  const [axisTicks, setAxisTicks] = useState(10);
  const [label, setLabel] = useState("Date");
  const [useCustom, setUseCustom] = useState(false);
  const [customJson, setCustomJson] = useState(
    JSON.stringify(
      [
        { notify: "2020-02-15", finalisation: "2020-10-01", partials: ["2020-04-01", "2020-07-10"] },
        { notify: "2022-03-10", finalisation: "2023-01-20", partials: ["2022-06-01", "2022-12-15"] },
        { notify: "2024-01-05", finalisation: "2025-03-15", partials: ["2024-04-09", "2024-09-30"] }
      ],
      null,
      2
    )
  );
  const [rowGap, setRowGap] = useState(20);
  const [margins, setMargins] = useState({ left: 70, right: 24, top: 28, bottom: 52 });
  const [dedupeMonthly, setDedupeMonthly] = useState(true);
  const [trainCutStr, setTrainCutStr] = useState("2021-06-30");
  const [valCutStr, setValCutStr] = useState("2023-06-30");
  const [testCutStr, setTestCutStr] = useState("2025-01-01");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const COLORS = { train: "#2563eb", val: "#f59e0b", test: "#10b981", post: "#9ca3af" };
  const FADE_OPACITY = 0.35;
  const LEAK_OPACITY = 0.35;
  const LEAK_DASH = "3 3";
  const seed = useMemo(() => hashStringToSeed(seedText), [seedText]);
  const SPLIT_OPTIONS = [
    { id: "notify", label: "Notification date" },
    { id: "finalisation", label: "Finalisation date" },
    { id: "notifyDup", label: "Both" }
  ];
  const [splitMode, setSplitMode] = useState("finalisation");
  const [startDate, endDate] = useMemo(() => {
    const s = new Date(startDateStr);
    const e = new Date(endDateStr);
    return [isNaN(s.getTime()) ? /* @__PURE__ */ new Date("2020-01-01") : s, isNaN(e.getTime()) ? /* @__PURE__ */ new Date("2025-01-01") : e];
  }, [startDateStr, endDateStr]);
  const [trainCut, valCut, testCut] = useMemo(() => {
    const tCut = clampDate(new Date(trainCutStr), startDate, endDate);
    const vCut = clampDate(new Date(valCutStr), startDate, endDate);
    const testCut2 = clampDate(new Date(testCutStr), startDate, endDate);
    const sorted = [tCut, vCut, testCut2].sort((a, b) => a.getTime() - b.getTime());
    return sorted;
  }, [trainCutStr, valCutStr, testCutStr, startDate, endDate]);
  function datasetForNotify(tDate) {
    if (tDate < trainCut) return "train";
    if (tDate < valCut) return "val";
    if (tDate < testCut) return "test";
    return "post";
  }
  function datasetForFinalisation(sDate) {
    if (sDate < trainCut) return "train";
    if (sDate < valCut) return "val";
    if (sDate < testCut) return "test";
    return "post";
  }
  const autoClaims = useMemo(
    () => generateClaims({
      n: numClaims,
      startDate,
      endDate,
      minDurDays,
      maxDurDays,
      maxPartials,
      seed,
      dedupeMonthly
    }),
    [numClaims, startDate, endDate, minDurDays, maxDurDays, maxPartials, seed, dedupeMonthly]
  );
  const parsedCustom = useMemo(() => {
    if (!useCustom) return null;
    try {
      const parsed = JSON.parse(customJson);
      const mapped = parsed.map((c, i) => {
        const notify = parseMaybeDate(c.notify, startDate);
        const finalisation = parseMaybeDate(c.finalisation, startDate);
        const partials = (c.partials || []).map((p) => parseMaybeDate(p, startDate)).filter(Boolean);
        if (!notify || !finalisation) return null;
        const accident = addDays(notify, -30);
        return {
          accident,
          notify,
          finalisation,
          partials: dedupeMonthly ? dedupeByCalendarMonth(partials) : partials,
          payments: [...partials.map((date) => ({ date, amount: 5e3 })), { date: finalisation, amount: 1e4 }],
          staticCovariates: {
            claimId: `CUSTOM${i + 1}`,
            postcode: "2000",
            claimType: "Motor",
            region: "Metro",
            policyYear: notify.getUTCFullYear(),
            totalAmount: 15e3
          }
        };
      }).filter(Boolean);
      mapped.sort((a, b) => a.notify.getTime() - b.notify.getTime());
      return mapped;
    } catch (e) {
      console.warn("Failed to parse custom JSON:", e);
      return null;
    }
  }, [useCustom, customJson, startDateStr, startDate, endDate, dedupeMonthly]);
  const claims = useCustom && parsedCustom ? parsedCustom : autoClaims;
  const [didInitCuts, setDidInitCuts] = useState(false);
  useEffect(() => {
    if (didInitCuts || !claims.length) return;
    const notifyDates = claims.map((c) => c.notify).sort((a, b) => a.getTime() - b.getTime());
    const third = Math.floor(notifyDates.length / 3);
    const twoThirds = Math.floor(2 * notifyDates.length / 3);
    if (third < notifyDates.length && twoThirds < notifyDates.length) {
      const suggestedTrainCut = toISODate(notifyDates[third]);
      const suggestedValCut = toISODate(notifyDates[twoThirds]);
      if (trainCutStr === "2021-06-30" && valCutStr === "2023-06-30") {
        setTrainCutStr(suggestedTrainCut);
        setValCutStr(suggestedValCut);
      }
    }
    setDidInitCuts(true);
  }, [claims, startDate, didInitCuts]);
  function buildRows(localClaims, mode) {
    const rows2 = [];
    for (let i = 0; i < localClaims.length; i++) {
      const c = localClaims[i];
      if (mode === "notify") {
        const dataset = datasetForNotify(c.notify);
        let cutoffDate = testCut;
        if (dataset === "train") cutoffDate = trainCut;
        else if (dataset === "val") cutoffDate = valCut;
        else if (dataset === "test") cutoffDate = testCut;
        const isCensored = c.finalisation > cutoffDate;
        rows2.push({
          claim: c,
          dataset,
          isCensored,
          observedEnd: cutoffDate,
          isDuplicate: false,
          hasDuplicate: false,
          linkFrom: null,
          leakUntil: null
        });
      } else if (mode === "finalisation") {
        const dataset = datasetForFinalisation(c.finalisation);
        rows2.push({
          claim: c,
          dataset,
          isCensored: false,
          observedEnd: null,
          isDuplicate: false,
          hasDuplicate: false,
          linkFrom: null,
          leakUntil: null
        });
      } else if (mode === "notifyDup") {
        const notifyDataset = datasetForNotify(c.notify);
        let cutoffDate = testCut;
        if (notifyDataset === "train") cutoffDate = trainCut;
        else if (notifyDataset === "val") cutoffDate = valCut;
        else if (notifyDataset === "test") cutoffDate = testCut;
        const isCensored = c.finalisation > cutoffDate;
        let hasDuplicate = false;
        if (isCensored) {
          if (notifyDataset === "train" && c.finalisation >= trainCut && c.finalisation < valCut) hasDuplicate = true;
          if (notifyDataset === "val" && c.finalisation >= valCut && c.finalisation < testCut) hasDuplicate = true;
        }
        const primaryIdx = rows2.length;
        rows2.push({
          claim: c,
          dataset: notifyDataset,
          isCensored,
          observedEnd: cutoffDate,
          isDuplicate: false,
          hasDuplicate,
          linkFrom: null,
          leakUntil: null
        });
        if (hasDuplicate) {
          let dupDataset = "test";
          let dupLeakUntil = valCut;
          if (notifyDataset === "train") {
            dupDataset = "val";
            dupLeakUntil = trainCut;
          }
          rows2.push({
            claim: c,
            dataset: dupDataset,
            isCensored: false,
            observedEnd: null,
            isDuplicate: true,
            hasDuplicate: false,
            linkFrom: primaryIdx,
            leakUntil: dupLeakUntil
          });
        }
      }
    }
    return rows2;
  }
  const rows = useMemo(() => buildRows(claims, splitMode), [claims, splitMode, trainCut, valCut, testCut, endDate]);
  const width = 1100;
  const contentHeight = Math.max(1, rows.length) * rowGap;
  const height = margins.top + contentHeight + margins.bottom;
  const xMin = startDate.getTime();
  const xMax = endDate.getTime();
  function xScale(date) {
    const t = date.getTime();
    const frac = (t - xMin) / (xMax - xMin);
    return margins.left + frac * (width - margins.left - margins.right);
  }
  function yScale(i) {
    return margins.top + 10 + i * rowGap;
  }
  const svgRef = useRef(null);
  function downloadSVG() {
    const svg = svgRef.current;
    if (!svg) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    const svgBlob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "claims_splitting_diagram.svg";
    link.click();
    URL.revokeObjectURL(url);
  }
  function formatTick(d) {
    const year = d.getUTCFullYear();
    const month = d.getUTCMonth();
    return month === 0 ? String(year) : `${year}-${String(month + 1).padStart(2, "0")}`;
  }
  const ticks = useMemo(() => {
    return generateSmartTicks(startDate, endDate, axisTicks);
  }, [startDate, endDate, axisTicks]);
  return /* @__PURE__ */ React.createElement("div", { className: "w-full relative" }, /* @__PURE__ */ React.createElement("div", { className: "w-full p-4 flex flex-col items-center" }, /* @__PURE__ */ React.createElement("div", { className: "mb-3 text-sm flex flex-wrap items-center justify-center gap-4" }, /* @__PURE__ */ React.createElement("span", { className: "font-medium" }, "Split by:"), /* @__PURE__ */ React.createElement("label", { className: "inline-flex items-center gap-2" }, /* @__PURE__ */ React.createElement("input", { type: "radio", name: "splitModeTop", value: "notify", checked: splitMode === "notify", onChange: (e) => setSplitMode(e.target.value) }), /* @__PURE__ */ React.createElement("span", null, "Notification date")), /* @__PURE__ */ React.createElement("label", { className: "inline-flex items-center gap-2" }, /* @__PURE__ */ React.createElement("input", { type: "radio", name: "splitModeTop", value: "finalisation", checked: splitMode === "finalisation", onChange: (e) => setSplitMode(e.target.value) }), /* @__PURE__ */ React.createElement("span", null, "Finalisation date")), /* @__PURE__ */ React.createElement("label", { className: "inline-flex items-center gap-2" }, /* @__PURE__ */ React.createElement("input", { type: "radio", name: "splitModeTop", value: "notifyDup", checked: splitMode === "notifyDup", onChange: (e) => setSplitMode(e.target.value) }), /* @__PURE__ */ React.createElement("span", null, "Both"))), /* @__PURE__ */ React.createElement("div", { className: "w-4/5 overflow-auto rounded-2xl ring-1 ring-gray-300" }, /* @__PURE__ */ React.createElement("svg", { ref: svgRef, xmlns: "http://www.w3.org/2000/svg", viewBox: `0 0 ${width} ${height}`, width: "100%", role: "img" }, /* @__PURE__ */ React.createElement("rect", { x: 0, y: 0, width, height, fill: "white" }), /* @__PURE__ */ React.createElement("defs", null, /* @__PURE__ */ React.createElement("marker", { id: "dup-arrow", viewBox: "0 0 10 10", refX: "6", refY: "5", markerWidth: "6", markerHeight: "6", orient: "auto-start-reverse" }, /* @__PURE__ */ React.createElement("path", { d: "M 0 0 L 10 5 L 0 10 z", fill: "#6b7280" }))), /* @__PURE__ */ React.createElement("g", null, /* @__PURE__ */ React.createElement("line", { x1: margins.left, y1: margins.top + 10 + contentHeight + 10, x2: width - margins.right, y2: margins.top + 10 + contentHeight + 10, stroke: "#111827", strokeWidth: 1 }), ticks.map((t, i) => {
    const x = xScale(t);
    return /* @__PURE__ */ React.createElement("g", { key: i }, /* @__PURE__ */ React.createElement("line", { x1: x, y1: margins.top + 10 + contentHeight + 10, x2: x, y2: margins.top + 10 + contentHeight + 15, stroke: "#111827", strokeWidth: 1 }), /* @__PURE__ */ React.createElement("text", { x, y: margins.top + 10 + contentHeight + 30, textAnchor: "middle", fontSize: 10, fill: "#111827" }, formatTick(t)));
  }), /* @__PURE__ */ React.createElement("text", { x: (margins.left + width - margins.right) / 2, y: height - 10, textAnchor: "middle", fontSize: 12, fill: "#111827" }, label)), /* @__PURE__ */ React.createElement("g", null, [{ label: "Train cutoff", x: trainCut }, { label: "Validation cutoff", x: valCut }, { label: "Test cutoff", x: testCut }].map((c, idx) => {
    const x = xScale(c.x);
    return /* @__PURE__ */ React.createElement("g", { key: idx }, /* @__PURE__ */ React.createElement("line", { x1: x, y1: margins.top, x2: x, y2: margins.top + 10 + contentHeight, stroke: "#6b7280", strokeWidth: 1, strokeDasharray: "4 4", opacity: 0.7 }), /* @__PURE__ */ React.createElement("text", { x, y: margins.top - 5, textAnchor: "middle", fontSize: 10, fill: "#6b7280" }, c.label));
  })), /* @__PURE__ */ React.createElement("g", null, rows.map((r, idx) => {
    const c = r.claim;
    const y = yScale(idx);
    const color = COLORS[r.dataset] || "#000";
    const xNotify = xScale(c.notify);
    const finalisationClamped = clampDate(c.finalisation, startDate, endDate);
    const observedEndClamped = r.observedEnd ? clampDate(r.observedEnd, startDate, endDate) : finalisationClamped;
    const xFinalisation = xScale(finalisationClamped);
    return /* @__PURE__ */ React.createElement("g", { key: `${idx}-${r.isDuplicate ? "dup" : "main"}` }, (() => {
      let mainLineEnd = xFinalisation;
      let mainLineOpacity = 1;
      let mainLineDash = null;
      if (r.isDuplicate && r.leakUntil) {
        const leakEndX = xScale(r.leakUntil);
        if (xNotify < leakEndX) {
          return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
            "line",
            {
              x1: xNotify,
              y1: y,
              x2: Math.min(leakEndX, xFinalisation),
              y2: y,
              stroke: color,
              strokeWidth: 2,
              strokeDasharray: LEAK_DASH,
              opacity: LEAK_OPACITY
            }
          ), leakEndX < xFinalisation && /* @__PURE__ */ React.createElement(
            "line",
            {
              x1: leakEndX,
              y1: y,
              x2: xFinalisation,
              y2: y,
              stroke: color,
              strokeWidth: 2
            }
          ));
        }
      }
      if (!r.isDuplicate && r.isCensored) {
        const xObservedEnd = xScale(observedEndClamped);
        mainLineEnd = xObservedEnd;
      }
      return /* @__PURE__ */ React.createElement(
        "line",
        {
          x1: xNotify,
          y1: y,
          x2: mainLineEnd,
          y2: y,
          stroke: color,
          strokeWidth: 2,
          strokeDasharray: mainLineDash,
          opacity: mainLineOpacity
        }
      );
    })(), /* @__PURE__ */ React.createElement("circle", { cx: xNotify, cy: y, r: 4, fill: "white", stroke: color, strokeWidth: 2 }), /* @__PURE__ */ React.createElement(XMark, { x: xFinalisation, y, size: 6, strokeWidth: 2, color }), splitMode === "notifyDup" && r.isDuplicate && typeof r.linkFrom === "number" && /* @__PURE__ */ React.createElement(
      "line",
      {
        x1: xNotify,
        y1: yScale(r.linkFrom) + 5,
        x2: xNotify,
        y2: y - 5,
        stroke: "#6b7280",
        strokeDasharray: "2 2",
        markerEnd: "url(#dup-arrow)",
        opacity: 0.7
      }
    ), !r.isDuplicate && r.isCensored && /* @__PURE__ */ React.createElement(React.Fragment, null, !r.hasDuplicate && finalisationClamped.getTime() > observedEndClamped.getTime() && /* @__PURE__ */ React.createElement(
      "line",
      {
        x1: xScale(observedEndClamped),
        y1: y,
        x2: xScale(finalisationClamped),
        y2: y,
        stroke: splitMode === "notify" ? COLORS.post : color,
        strokeWidth: 2,
        strokeDasharray: "6 6",
        opacity: FADE_OPACITY
      }
    ), /* @__PURE__ */ React.createElement(SquareMark, { x: xScale(observedEndClamped), y, size: 10, strokeWidth: 2, color })), c.partials.map((t, j) => {
      if (t > testCut) return null;
      let visibleUntil = finalisationClamped;
      if (!r.isDuplicate && r.isCensored && r.hasDuplicate) {
        visibleUntil = observedEndClamped;
      }
      if (t > visibleUntil) return null;
      let op = 1;
      if (!r.isDuplicate && r.isCensored && !r.hasDuplicate && t > observedEndClamped) op = FADE_OPACITY;
      if (r.isDuplicate) {
        const leakUntil = r.leakUntil || trainCut;
        if (t < leakUntil) op = LEAK_OPACITY;
      }
      const x = xScale(t);
      return /* @__PURE__ */ React.createElement(XMark, { key: j, x, y, size: 4, strokeWidth: 1.5, color, opacity: op });
    }));
  })))), /* @__PURE__ */ React.createElement("div", { className: "mt-3 relative w-4/5" }, /* @__PURE__ */ React.createElement("div", { className: "pointer-events-none absolute inset-0 flex justify-center items-center" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-4 text-sm" }, /* @__PURE__ */ React.createElement("span", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "inline-block w-4 h-0.5", style: { background: COLORS.train } }), "Train"), /* @__PURE__ */ React.createElement("span", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "inline-block w-4 h-0.5", style: { background: COLORS.val } }), "Validation"), /* @__PURE__ */ React.createElement("span", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "inline-block w-4 h-0.5", style: { background: COLORS.test } }), "Test"), /* @__PURE__ */ React.createElement("span", { className: "flex items-center gap-2 opacity-70" }, /* @__PURE__ */ React.createElement("span", { className: "inline-block w-4 h-0.5", style: { background: COLORS.post } }), "Unused"))), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-[auto_1fr_auto] items-center gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement("button", { onClick: () => setSidebarOpen(!sidebarOpen), className: "px-3 py-2 rounded-xl ring-1 ring-gray-300 hover:bg-gray-50" }, sidebarOpen ? "Hide Controls" : "Show Controls"), /* @__PURE__ */ React.createElement("button", { onClick: downloadSVG, className: "px-3 py-2 rounded-xl ring-1 ring-gray-300 hover:bg-gray-50", title: "Download SVG" }, "Download SVG"), /* @__PURE__ */ React.createElement("button", { onClick: () => setSeedText(String(Date.now())), className: "px-3 py-2 rounded-xl ring-1 ring-gray-300 hover:bg-gray-50", title: "Randomise dataset" }, "Randomise dataset")), /* @__PURE__ */ React.createElement("div", null), /* @__PURE__ */ React.createElement("div", { className: "flex justify-end items-center gap-4 text-sm" }, splitMode === "notify" && /* @__PURE__ */ React.createElement("span", { className: "flex items-center gap-2 opacity-80" }, /* @__PURE__ */ React.createElement("svg", { width: "24", height: "8", className: "inline-block", "aria-hidden": true }, /* @__PURE__ */ React.createElement("line", { x1: "0", y1: "4", x2: "24", y2: "4", stroke: "#6b7280", strokeWidth: "2", strokeDasharray: "6 6" })), "Censored region"), splitMode === "notifyDup" && /* @__PURE__ */ React.createElement("span", { className: "flex items-center gap-2 opacity-80" }, /* @__PURE__ */ React.createElement("svg", { width: "24", height: "8", className: "inline-block", "aria-hidden": true }, /* @__PURE__ */ React.createElement("line", { x1: "0", y1: "4", x2: "24", y2: "4", stroke: "#111827", strokeWidth: "2", strokeDasharray: "3 3" })), "Data Leakage"))))), sidebarOpen && /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 bg-black bg-opacity-50 z-40", onClick: () => setSidebarOpen(false) }), /* @__PURE__ */ React.createElement("div", { className: `fixed top-0 right-0 h-full w-80 bg-white shadow-xl transform transition-transform duration-300 ease-in-out z-50 ${sidebarOpen ? "translate-x-0" : "translate-x-full"}` }, /* @__PURE__ */ React.createElement("div", { className: "p-4 h-full overflow-y-auto" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-4" }, /* @__PURE__ */ React.createElement("div", { className: "text-lg font-semibold" }, "Controls"), /* @__PURE__ */ React.createElement("button", { onClick: () => setSidebarOpen(false), className: "p-2 hover:bg-gray-100 rounded-lg" }, /* @__PURE__ */ React.createElement("svg", { className: "w-5 h-5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" }, /* @__PURE__ */ React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" })))), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 gap-3" }, /* @__PURE__ */ React.createElement("label", { className: "flex flex-col text-sm" }, "Start date", /* @__PURE__ */ React.createElement("input", { type: "date", className: "mt-1 p-2 rounded-xl ring-1 ring-gray-300", value: startDateStr, onChange: (e) => setStartDateStr(e.target.value) })), /* @__PURE__ */ React.createElement("label", { className: "flex flex-col text-sm" }, "End date", /* @__PURE__ */ React.createElement("input", { type: "date", className: "mt-1 p-2 rounded-xl ring-1 ring-gray-300", value: endDateStr, onChange: (e) => setEndDateStr(e.target.value) })), /* @__PURE__ */ React.createElement("label", { className: "flex flex-col text-sm" }, "Number of claims", /* @__PURE__ */ React.createElement("input", { type: "range", className: "mt-2 w-full", min: 1, max: 200, step: 1, value: numClaims, onChange: (e) => setNumClaims(Number(e.target.value)) }), /* @__PURE__ */ React.createElement("div", { className: "text-xs mt-1" }, "Current: ", numClaims)), /* @__PURE__ */ React.createElement("label", { className: "flex flex-col text-sm" }, "Min duration (days)", /* @__PURE__ */ React.createElement("input", { type: "number", className: "mt-1 p-2 rounded-xl ring-1 ring-gray-300", value: minDurDays, min: 1, onChange: (e) => setMinDurDays(Math.max(1, Number(e.target.value))) })), /* @__PURE__ */ React.createElement("label", { className: "flex flex-col text-sm" }, "Max duration (days)", /* @__PURE__ */ React.createElement("input", { type: "number", className: "mt-1 p-2 rounded-xl ring-1 ring-gray-300", value: maxDurDays, min: minDurDays, onChange: (e) => setMaxDurDays(Math.max(minDurDays, Number(e.target.value))) })), /* @__PURE__ */ React.createElement("label", { className: "flex flex-col text-sm" }, "Max partial payments", /* @__PURE__ */ React.createElement("input", { type: "number", className: "mt-1 p-2 rounded-xl ring-1 ring-gray-300", value: maxPartials, min: 0, onChange: (e) => setMaxPartials(Math.max(0, Number(e.target.value))) })), /* @__PURE__ */ React.createElement("label", { className: "flex flex-col text-sm" }, "Axis ticks", /* @__PURE__ */ React.createElement("input", { type: "number", className: "mt-1 p-2 rounded-xl ring-1 ring-gray-300", value: axisTicks, min: 1, onChange: (e) => setAxisTicks(Math.max(1, Number(e.target.value))) })), /* @__PURE__ */ React.createElement("label", { className: "flex flex-col text-sm" }, "Row gap (px)", /* @__PURE__ */ React.createElement("input", { type: "number", className: "mt-1 p-2 rounded-xl ring-1 ring-gray-300", value: rowGap, min: 10, onChange: (e) => setRowGap(Math.max(10, Number(e.target.value))) })), /* @__PURE__ */ React.createElement("div", { className: "flex flex-col text-sm" }, /* @__PURE__ */ React.createElement("span", null, "Canvas margins"), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-4 gap-2 mt-1" }, /* @__PURE__ */ React.createElement("input", { type: "number", className: "p-2 rounded-xl ring-1 ring-gray-300", value: margins.left, onChange: (e) => setMargins({ ...margins, left: Number(e.target.value) }), title: "Left" }), /* @__PURE__ */ React.createElement("input", { type: "number", className: "p-2 rounded-xl ring-1 ring-gray-300", value: margins.right, onChange: (e) => setMargins({ ...margins, right: Number(e.target.value) }), title: "Right" }), /* @__PURE__ */ React.createElement("input", { type: "number", className: "p-2 rounded-xl ring-1 ring-gray-300", value: margins.top, onChange: (e) => setMargins({ ...margins, top: Number(e.target.value) }), title: "Top" }), /* @__PURE__ */ React.createElement("input", { type: "number", className: "p-2 rounded-xl ring-1 ring-gray-300", value: margins.bottom, onChange: (e) => setMargins({ ...margins, bottom: Number(e.target.value) }), title: "Bottom" }))), /* @__PURE__ */ React.createElement("div", { className: "space-y-3" }, /* @__PURE__ */ React.createElement("label", { className: "flex flex-col text-sm" }, "Train cutoff (date)", /* @__PURE__ */ React.createElement("input", { type: "date", className: "mt-1 p-2 rounded-xl ring-1 ring-gray-300", value: toISODate(trainCut), onChange: (e) => setTrainCutStr(e.target.value) })), /* @__PURE__ */ React.createElement("label", { className: "flex flex-col text-sm" }, "Validation cutoff (date)", /* @__PURE__ */ React.createElement("input", { type: "date", className: "mt-1 p-2 rounded-xl ring-1 ring-gray-300", value: toISODate(valCut), onChange: (e) => setValCutStr(e.target.value) })), /* @__PURE__ */ React.createElement("label", { className: "flex flex-col text-sm" }, "Test cutoff (date)", /* @__PURE__ */ React.createElement("input", { type: "date", className: "mt-1 p-2 rounded-xl ring-1 ring-gray-300", value: toISODate(testCut), onChange: (e) => setTestCutStr(e.target.value) }))), /* @__PURE__ */ React.createElement("label", { className: "flex flex-col text-sm" }, "Seed (text)", /* @__PURE__ */ React.createElement("input", { type: "text", className: "mt-1 p-2 rounded-xl ring-1 ring-gray-300", value: seedText, onChange: (e) => setSeedText(e.target.value) }))), /* @__PURE__ */ React.createElement("div", { className: "mt-6" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mb-2" }, /* @__PURE__ */ React.createElement("input", { id: "useCustom", type: "checkbox", checked: useCustom, onChange: (e) => setUseCustom(e.target.checked) }), /* @__PURE__ */ React.createElement("label", { htmlFor: "useCustom", className: "text-sm font-medium" }, "Use custom data (JSON)")), /* @__PURE__ */ React.createElement("textarea", { className: "w-full h-40 p-3 rounded-xl ring-1 ring-gray-300 font-mono text-xs", value: customJson, onChange: (e) => setCustomJson(e.target.value), disabled: !useCustom }), /* @__PURE__ */ React.createElement("div", { className: "text-xs opacity-70 mt-2" }, "Format: [ ", "{ notify: ISOstring|number, finalisation: ISOstring|number, partials: (ISOstring|number)[] }", ", ... ]", /* @__PURE__ */ React.createElement("br", null), "If numbers are provided, they are interpreted as ", /* @__PURE__ */ React.createElement("strong", null, "days since Start date"), ".")))));
}
window.ClaimsDiagram = ClaimsDiagram;
