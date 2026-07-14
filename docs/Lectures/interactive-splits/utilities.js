// Utility Functions
// Shared utility functions used across components

// -------------------- Date Helpers --------------------

const MS_PER_DAY = 86400000;

function toISODate(d) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString().slice(0, 10);
}

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
  if (typeof value === 'string') {
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d;
  }
  if (typeof value === 'number' && baseStart instanceof Date) {
    return addDays(baseStart, value);
  }
  return null;
}

function monthKeyUTC(d) {
  return d.getUTCFullYear() * 12 + d.getUTCMonth();
}

function dedupeByCalendarMonth(dates) {
  const seen = new Set();
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

function startOfQuarterUTC(d) {
  const y = d.getUTCFullYear();
  const qStartMonth = Math.floor(d.getUTCMonth() / 3) * 3;
  return new Date(Date.UTC(y, qStartMonth, 1));
}

function addQuartersUTC(d, n) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 3 * n, 1));
}

function quarterKeyFromUTC(d) {
  const y = d.getUTCFullYear();
  const q = Math.floor(d.getUTCMonth() / 3) + 1;
  return `${y}Q${q}`;
}

// -------------------- Formatting Helpers --------------------

function formatCurrency(amount) {
  if (amount == null || isNaN(amount)) {
    return "-";
  }
  return `$${Number(amount).toFixed(2)}`;
}

// -------------------- Random Number Helpers --------------------

function hashStringToSeed(str) {
  let h = 2166136261 >>> 0; // FNV-1a basis
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// -------------------- Quarter Helpers --------------------

function parseQuarterKey(qk) {
  const m = qk && qk.match(/(\d{4})Q(\d)/);
  if (!m) return null;
  return { year: parseInt(m[1], 10), quarter: parseInt(m[2], 10) };
}

function formatQuarterKey(obj) {
  return `${obj.year}Q${obj.quarter}`;
}

function prevQuarterKey(qk) {
  const q = parseQuarterKey(qk);
  if (!q) return null;
  let y = q.year, qu = q.quarter - 1;
  if (qu < 1) { qu = 4; y -= 1; }
  return `${y}Q${qu}`;
}

function nextQuarterKey(qk) {
  const q = parseQuarterKey(qk);
  if (!q) return null;
  let y = q.year, qu = q.quarter + 1;
  if (qu > 4) { qu = 1; y += 1; }
  return `${y}Q${qu}`;
}

function getQuarterInfo(date, referenceDate) {
  // Validate inputs
  if (!date || !referenceDate || isNaN(date.getTime()) || isNaN(referenceDate.getTime())) {
    return {
      calendarYear: 2020,
      calendarQuarter: 1,
      developmentQuarter: 0,
      quarterKey: '2020Q1'
    };
  }

  const refYear = referenceDate.getUTCFullYear();
  const refQuarter = Math.floor(referenceDate.getUTCMonth() / 3);

  const dateYear = date.getUTCFullYear();
  const dateQuarter = Math.floor(date.getUTCMonth() / 3);

  const quartersSinceRef = (dateYear - refYear) * 4 + (dateQuarter - refQuarter);

  // Clamp to reasonable range
  const clampedQuarters = Math.max(-50, Math.min(50, quartersSinceRef));

  return {
    calendarYear: dateYear,
    calendarQuarter: dateQuarter + 1,
    developmentQuarter: clampedQuarters, // 0-based by default
    quarterKey: `${dateYear}Q${dateQuarter + 1}`
  };
}

// -------------------- Price Index Helpers --------------------

/**
 * Generate a deterministic quarterly Price Index time series between startDate and endDate (inclusive, by quarter).
 * Base ~100 at the first quarter, then apply a small positive drift with light noise.
 * Returns: { series: [{date, quarterKey, index}], map: { [quarterKey]: index } }
 */
function generatePriceIndexSeries(startDate, endDate, seed = 1) {
  const series = [];
  const map = {};
  const rnd = mulberry32((seed ^ 0x9e3779b9) >>> 0);

  let q = startOfQuarterUTC(new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1)));
  const lastQ = startOfQuarterUTC(new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), 1)));

  // Start around 100
  let idx = 100;
  while (q <= lastQ) {
    // Drift ~ +1.0% to +1.6% per quarter, plus small noise [-0.4%, +0.4%]
    const drift = 0.013 + (rnd() * 0.006);     // [1.3%, 1.9%]
    const noise = (rnd() - 0.5) * 0.008;       // [-0.4%, +0.4%]
    idx = Math.max(60, idx * (1 + drift + noise));
    const k = quarterKeyFromUTC(q);
    series.push({ date: new Date(q), quarterKey: k, index: idx });
    map[k] = idx;
    q = addQuartersUTC(q, 1);
  }

  return { series, map };
}

/**
 * Construct a mid-quarter index map using geometric means of end-of-quarter indices:
 *   PI_mid[q] = sqrt( PI_eoq[q-1] * PI_eoq[q] )
 * For the first available quarter, fall back to PI_eoq[q].
 */
function buildMidQuarterIndexMap(priceIndexMap) {
  if (!priceIndexMap) return null;
  const midMap = {};
  const keys = Object.keys(priceIndexMap).sort(); // lexical sort works for YYYYQn
  for (const k of keys) {
    const prev = prevQuarterKey(k);
    const eoq = priceIndexMap[k];
    const prevVal = priceIndexMap[prev];
    if (prevVal && eoq) {
      midMap[k] = Math.sqrt(prevVal * eoq);
    } else {
      midMap[k] = eoq; // fallback for first quarter in range
    }
  }
  return midMap;
}

/** Adjust a nominal amount from paymentDate's quarter to targetDate's quarter using the Price Index. */
function adjustUsingPriceIndex(nominalAmount, paymentDate, targetDate, priceIndexMap) {
  if (!paymentDate || !targetDate || !priceIndexMap) return nominalAmount;
  const srcKey = getQuarterInfo(paymentDate, paymentDate).quarterKey;
  const tgtKey = getQuarterInfo(targetDate, targetDate).quarterKey;
  const srcIdx = priceIndexMap[srcKey];
  const tgtIdx = priceIndexMap[tgtKey];
  if (!srcIdx || !tgtIdx) return nominalAmount;
  return nominalAmount * (tgtIdx / srcIdx);
}

/** Adjustment factor between two quarter keys using the Price Index map. */
function calculateAdjustmentFactorByIndex(sourceQuarterKey, targetQuarterKey, priceIndexMap) {
  if (!priceIndexMap) return 1.0;
  const s = priceIndexMap[sourceQuarterKey];
  const t = priceIndexMap[targetQuarterKey];
  if (!s || !t) return 1.0;
  return t / s;
}

// -------------------- Tick Generation Helpers --------------------

function generateSmartTicks(start, end, maxTicks = 10) {
  const spanDays = daysBetween(start, end);
  const ticks = [];
  maxTicks = Math.max(2, Math.floor(maxTicks));
  if (spanDays > 365 * 3) {
    // Yearly ticks
    const startY = start.getUTCFullYear();
    const endY = end.getUTCFullYear();
    const totalYears = endY - startY + 1;
    const stepY = Math.max(1, Math.ceil(totalYears / maxTicks));
    for (let y = startY; y <= endY; y += stepY) {
      ticks.push(new Date(Date.UTC(y, 0, 1)));
    }
  } else {
    // Monthly/quarterly ticks (step chosen to fit under maxTicks)
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

// -------------------- Aggregation Helpers --------------------

function aggregateClaimToQuarters(claim, oneBasedDevQuarters = false, observationEndDate = null, priceIndexMap = null) {
  // Validate claim object
  if (!claim || !claim.accident || !claim.notify || !claim.finalisation || !claim.staticCovariates || !claim.payments) {
    return {
      claimInfo: {
        claimId: 'INVALID',
        Legal_Representation: 'N',
        Injury_Severity: '1',
        Age_of_Claimant: 'Unknown',
        accidentDate: new Date(),
        notifyDate: new Date(),
        finalisationDate: new Date(),
        accidentQuarter: '2020Q1',
        notifyQuarter: '2020Q1',
        notifyLag: 0
      },
      quarters: []
    };
  }

  const accidentQuarter = getQuarterInfo(claim.accident, claim.accident);
  const notifyQuarter = getQuarterInfo(claim.notify, claim.accident);
  const finalisationQuarter = getQuarterInfo(claim.finalisation, claim.accident);

  // Group payments by quarter
  const quarterlyPayments = new Map();

  for (const payment of claim.payments) {
    const paymentQuarter = getQuarterInfo(payment.date, claim.accident);
    const key = paymentQuarter.quarterKey;

    if (!quarterlyPayments.has(key)) {
      quarterlyPayments.set(key, {
        ...paymentQuarter,
        totalAmount: 0,
        paymentCount: 0,
        payments: []
      });
    }

    const quarterData = quarterlyPayments.get(key);
    quarterData.totalAmount += payment.amount;
    quarterData.paymentCount += 1;
    quarterData.payments.push(payment);
  }

  // Create complete sequence from accident to finalisation
  const startDevQuarter = accidentQuarter.developmentQuarter;
  const endDevQuarter = finalisationQuarter.developmentQuarter;
  const quarters = [];

  // Validate development quarter range
  if (endDevQuarter < startDevQuarter || endDevQuarter - startDevQuarter > 100) {
    // Invalid range, return minimal data
    return {
      claimInfo: {
        claimId: claim.staticCovariates.claimId,
        ...claim.staticCovariates,
        accidentDate: claim.accident,
        notifyDate: claim.notify,
        finalisationDate: claim.finalisation,
        accidentQuarter: accidentQuarter.quarterKey,
        notifyQuarter: notifyQuarter.quarterKey,
        notifyLag: notifyQuarter.developmentQuarter - accidentQuarter.developmentQuarter
      },
      quarters: []
    };
  }

  for (let devQ = startDevQuarter; devQ <= endDevQuarter; devQ++) {
    // Find existing quarter data or create empty one
    const existingQuarter = Array.from(quarterlyPayments.values())
      .find(q => q.developmentQuarter === devQ);

    if (existingQuarter) {
      // Apply inflation adjustment to quarterly aggregated amounts if observationEndDate is provided
      if (observationEndDate) {
        // Use mid-quarter price index for the source quarter:
        // PI_mid[q] = sqrt(PI_eoq[q-1] * PI_eoq[q])
        const observationQuarterKey = getQuarterInfo(observationEndDate, claim.accident).quarterKey;
        const targetPI = priceIndexMap ? priceIndexMap[observationQuarterKey] : null;
        const midMap = priceIndexMap ? buildMidQuarterIndexMap(priceIndexMap) : null;
        const sourceMidPI = midMap ? midMap[existingQuarter.quarterKey] : null;

        const nominalAmount = existingQuarter.totalAmount;
        const factor = (targetPI && sourceMidPI) ? (targetPI / sourceMidPI) : 1.0;
        const safeAdjustedAmount = isNaN(factor) ? nominalAmount : nominalAmount * factor;

        // Create adjusted quarter data. Keep payments nominal (for composition display).
        const adjustedQuarter = {
          ...existingQuarter,
          nominalAmount: nominalAmount,
          totalAmount: safeAdjustedAmount,
          inflationAdjusted: true,
          priceIndex: {
            targetQuarterKey: observationQuarterKey,
            targetPI,
            sourceQuarterKey: existingQuarter.quarterKey,
            sourceMidPI,
            factor
          },
          payments: existingQuarter.payments.map(payment => ({
            ...payment,
            nominalAmount: payment.amount,
            amount: payment.amount, // keep nominal for bar composition clarity
            inflationAdjusted: false
          }))
        };
        quarters.push(adjustedQuarter);
      } else {
        // No inflation adjustment - add nominalAmount property for consistency
        const quarterWithNominal = {
          ...existingQuarter,
          nominalAmount: existingQuarter.totalAmount,
          inflationAdjusted: false
        };
        quarters.push(quarterWithNominal);
      }
    } else {
      // Create empty quarter - need to determine calendar quarter
      const quarterDate = new Date(claim.accident);
      quarterDate.setMonth(quarterDate.getMonth() + (devQ * 3));
      const emptyQuarterInfo = getQuarterInfo(quarterDate, claim.accident);

      quarters.push({
        ...emptyQuarterInfo,
        developmentQuarter: devQ,
        totalAmount: 0,
        nominalAmount: 0,
        paymentCount: 0,
        payments: [],
        inflationAdjusted: !!observationEndDate
      });
    }
  }

  // Adjust development quarters if one-based is selected
  if (oneBasedDevQuarters) {
    quarters.forEach(q => {
      q.developmentQuarter = q.developmentQuarter + 1;
    });
  }

  return {
    claimInfo: {
      claimId: claim.staticCovariates.claimId,
      ...claim.staticCovariates,
      accidentDate: claim.accident,
      notifyDate: claim.notify,
      finalisationDate: claim.finalisation,
      accidentQuarter: accidentQuarter.quarterKey,
      notifyQuarter: notifyQuarter.quarterKey,
      notifyLag: notifyQuarter.developmentQuarter - accidentQuarter.developmentQuarter
    },
    quarters
  };
}

// -------------------- Claim Generation --------------------

function generateClaims({
  n = 20,
  startDate,
  endDate,
  minDurDays = 30,
  maxDurDays = 300,
  maxPartials = 3,
  seed = 1,
  dedupeMonthly = true,
  observationEndDate,
}) {
  const rand = mulberry32(seed);
  const claims = [];
  const totalDays = Math.max(1, daysBetween(startDate, endDate));
  const latestNotify = Math.max(0, totalDays - minDurDays);
  // Static covariate options
  const postcodes = ['2000', '3000', '4000', '5000', '6000', '7000', '1000'];
  const claimTypes = ['Motor', 'Property', 'Liability', 'Workers Comp'];
  const regions = ['Metro', 'Regional', 'Remote'];

  for (let i = 0; i < n; i++) {
    // Generate accident date (7-60 days before notification)
    const accidentOffset = 7 + Math.floor(rand() * 54);
    const notify = addDays(startDate, Math.floor(rand() * latestNotify));
    const accident = addDays(notify, -accidentOffset);

    const dur = minDurDays + Math.floor(rand() * Math.max(1, maxDurDays - minDurDays + 1));
    const rawFinalisation = addDays(notify, dur);
    const finalisation = rawFinalisation > endDate ? endDate : rawFinalisation;

    // Generate payments (using original logic)
    let k = Math.floor(rand() * (maxPartials + 1));
    if (daysBetween(notify, finalisation) < 2) k = 0;
    let payments = [];
    for (let j = 0; j < k; j++) {
      const spanDays = Math.max(1, daysBetween(notify, finalisation));
      const t = addDays(notify, Math.floor(rand() * spanDays));
      const amount = 1 + Math.floor(rand() * 9); // Random nominal amount 1-9

      payments.push({
        date: t,
        amount: amount // Store nominal amount initially
      });
    }

    // Filter, sort, and dedupe payments
    payments = payments
      .filter((p) => p.date > notify && p.date <= finalisation)
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    if (dedupeMonthly) {
      const seen = new Set();
      const deduped = [];
      for (const p of payments) {
        const key = monthKeyUTC(p.date);
        if (!seen.has(key)) {
          seen.add(key);
          deduped.push(p);
        } else {
          // If same month, add amounts together
          const existing = deduped.find(d => monthKeyUTC(d.date) === key);
          if (existing) {
            existing.amount += p.amount;
          }
        }
      }
      payments = deduped;
    }

    // Legacy partials for backward compatibility
    const partials = payments.map(p => p.date);

    // Static covariates
    const staticCovariates = {
      postcode: postcodes[Math.floor(rand() * postcodes.length)],
      claimType: claimTypes[Math.floor(rand() * claimTypes.length)],
      region: regions[Math.floor(rand() * regions.length)],
      claimId: `CLM-${String(i + 1).padStart(4, '0')}`
    };

    claims.push({
      accident,
      notify,
      finalisation,
      partials, // for backward compatibility
      payments, // new enhanced payment data
      staticCovariates
    });
  }
  claims.sort((a, b) => a.notify.getTime() - b.notify.getTime());
  return claims;
}

// Make utilities globally available
window.utils = {
  // Date helpers
  toISODate,
  clampDate,
  addDays,
  daysBetween,
  parseMaybeDate,
  monthKeyUTC,
  dedupeByCalendarMonth,
  startOfMonthUTC,
  addMonthsUTC,
  startOfQuarterUTC,
  addQuartersUTC,
  quarterKeyFromUTC,

  // Formatting
  formatCurrency,

  // Random
  hashStringToSeed,
  mulberry32,

  // Quarter helpers
  parseQuarterKey,
  formatQuarterKey,
  prevQuarterKey,
  nextQuarterKey,
  getQuarterInfo,

  // Price index
  generatePriceIndexSeries,
  buildMidQuarterIndexMap,
  adjustUsingPriceIndex,
  calculateAdjustmentFactorByIndex,

  // Tick generation
  generateSmartTicks,

  // Aggregation
  aggregateClaimToQuarters,

  // Claim generation
  generateClaims,
};
