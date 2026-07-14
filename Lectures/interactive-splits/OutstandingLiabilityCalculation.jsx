// OutstandingLiabilityCalculation Component
// Calculates and displays outstanding claim liability

function OutstandingLiabilityCalculation({
  quarters,
  claimInfo,
  endDate,
  priceIndexMap,
  midQuarterIndexMap
}) {
  // Use utilities from global scope
  const { getQuarterInfo, formatCurrency } = window.utils;

  const observationQuarterKey = getQuarterInfo(endDate, claimInfo.accidentDate).quarterKey;
  const targetPI = priceIndexMap ? priceIndexMap[observationQuarterKey] : null;

  // Ultimate = total inflation-adjusted payments over the claim lifetime
  const midMap = midQuarterIndexMap || {};
  const ultimateClaimSize = quarters.reduce((sum, q) => {
    const srcMid = midMap[q.quarterKey] || (priceIndexMap ? priceIndexMap[q.quarterKey] : null);
    const factor = (targetPI && srcMid) ? (targetPI / srcMid) : 1.0;
    return sum + (q.nominalAmount || q.totalAmount) * factor;
  }, 0);

  return (
    <div className="bg-green-50 p-4 rounded-lg">
      <div className="text-sm mb-3">
        <strong>Ultimate = Total Payments Over Claim Lifetime (adjusted to {observationQuarterKey}) = {formatCurrency(ultimateClaimSize)}</strong>
      </div>
      <div className="bg-white rounded border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Quarter</th>
              <th className="px-3 py-2 text-right font-medium">Cumulative Paid</th>
              <th className="px-3 py-2 text-right font-medium">Outstanding Liability</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              let cumulativeSum = 0;
              return quarters.map((quarter, i) => {
                const srcMid = midMap[quarter.quarterKey] || (priceIndexMap ? priceIndexMap[quarter.quarterKey] : null);
                const factor = (targetPI && srcMid) ? (targetPI / srcMid) : 1.0;
                const adjustedThisQuarter = (quarter.nominalAmount || quarter.totalAmount) * factor;
                cumulativeSum += adjustedThisQuarter;
                const outstandingLiability = Math.max(0, ultimateClaimSize - cumulativeSum);
                return (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="px-3 py-2 font-mono">Dev Q{quarter.developmentQuarter}</td>
                    <td className="px-3 py-2 text-right font-medium">{formatCurrency(cumulativeSum)}</td>
                    <td className="px-3 py-2 text-right font-medium">{formatCurrency(outstandingLiability)}</td>
                  </tr>
                );
              });
            })()}
          </tbody>
        </table>
      </div>
      <div className="text-xs text-gray-600 mt-2">
        OCL = <span className="font-mono">Ultimate</span> − <span className="font-mono">CumulativePaidToDate</span>
      </div>
    </div>
  );
}

// Make the component globally available
window.OutstandingLiabilityCalculation = OutstandingLiabilityCalculation;
