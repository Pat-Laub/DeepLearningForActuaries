// DevelopmentPeriodGeneration Component
// Displays development period calculation and training row generation

function DevelopmentPeriodGeneration({
  claimInfo,
  quarters,
  endDate,
  oneBasedDevQuarters,
  priceIndexMap,
  midQuarterIndexMap
}) {
  // Use utilities from global scope
  const { getQuarterInfo, formatCurrency } = window.utils;

  return (
    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
      {(() => {
            // Calculate key metrics
            const notifyQuarter = getQuarterInfo(claimInfo.notifyDate, claimInfo.accidentDate).developmentQuarter;
            const finalisationQuarter = getQuarterInfo(claimInfo.finalisationDate, claimInfo.accidentDate).developmentQuarter;
            const observationQuarter = getQuarterInfo(endDate, claimInfo.accidentDate).developmentQuarter;

            // Calculate valid training rows (quarters where we can observe the claim up to observation cutoff)
            const maxObservableQuarter = Math.min(finalisationQuarter, observationQuarter);
            const validNumRows = Math.max(0, maxObservableQuarter - notifyQuarter + 1);

            const svgHeight = 40 + validNumRows * 25; // Header + rows
            const startY = 35;
            const rowHeight = 15;
            const totalWidth = 560;

            return (
              <div className="space-y-4">
                {/* Visual Row Generation */}
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-xs font-medium mb-2">
                    Claim {claimInfo.claimId} → {validNumRows} Training Rows:
                  </div>
                  <svg width="100%" height={svgHeight} className="border rounded bg-white">
                    {/* Original claim representation at top */}
                    <rect x="20" y="10" width="560" height="15" fill="#E5E7EB" stroke="#9CA3AF" strokeWidth="1" rx="2" />
                    <text x="25" y="21" fontSize="10" fill="#374151" fontWeight="bold">
                      Original Claim {claimInfo.claimId}
                    </text>
                    <text x="450" y="21" fontSize="9" fill="#6B7280">
                      Notify Q{notifyQuarter} → Settle Q{finalisationQuarter}
                    </text>

                    {/* Training rows */}
                    {Array.from({ length: validNumRows }, (_, i) => {
                      const y = startY + i * 25;
                      const currentQuarter = notifyQuarter + i;
                      const isLastObservableRow = currentQuarter === maxObservableQuarter;

                      // Calculate widths
                      const totalQuarters = finalisationQuarter - notifyQuarter + 1;
                      const observedQuarters = currentQuarter - notifyQuarter + 1;
                      const cutoffWidth = (observedQuarters / totalQuarters) * totalWidth;

                      return (
                        <g key={i}>
                          {/* Full row background (censored part) */}
                          <rect
                            x="20"
                            y={y}
                            width={totalWidth}
                            height={rowHeight}
                            fill="#FEF3C7"
                            stroke="#F59E0B"
                            strokeWidth="1"
                            rx="2"
                            opacity="0.3"
                          />

                          {/* Visible (uncensored) part */}
                          {(() => {
                            // Compute outstanding liability for this row to decide color
                            const observationQuarter = getQuarterInfo(endDate, claimInfo.accidentDate);
                            const targetQuarterKey = observationQuarter.quarterKey;
                            const targetPI = priceIndexMap ? priceIndexMap[targetQuarterKey] : null;
                            const midMap = midQuarterIndexMap || {};
                            const ultimateClaimSize = quarters.reduce((sum, q) => {
                              const srcMid = midMap[q.quarterKey] || (priceIndexMap ? priceIndexMap[q.quarterKey] : null);
                              const factor = (targetPI && srcMid) ? (targetPI / srcMid) : 1.0;
                              return sum + (q.nominalAmount || q.totalAmount) * factor;
                            }, 0);

                            let cumulativeToDate = 0;
                            for (let qIdx = 0; qIdx < quarters.length; qIdx++) {
                              const q = quarters[qIdx];
                              if (q.developmentQuarter <= currentQuarter) {
                                const srcMid = midMap[q.quarterKey] || (priceIndexMap ? priceIndexMap[q.quarterKey] : null);
                                const factor = (targetPI && srcMid) ? (targetPI / srcMid) : 1.0;
                                cumulativeToDate += (q.nominalAmount || q.totalAmount) * factor;
                              }
                            }
                            const outstandingLiability = Math.max(0, ultimateClaimSize - cumulativeToDate);
                            const isZeroTarget = Math.round(outstandingLiability * 100) === 0;
                            const fillColor = isZeroTarget ? '#FEE2E2' : '#DBEAFE'; // red-100 if zero, otherwise blue-100

                            return (
                              <rect
                                x="20"
                                y={y}
                                width={cutoffWidth}
                                height={rowHeight}
                                fill={fillColor}
                                stroke="#3B82F6"
                                strokeWidth="1"
                                rx="2"
                              />
                            );
                          })()}

                          {/* Row label */}
                          <text x="25" y={y + 11} fontSize="9" fill="#374151" fontWeight="medium">
                            Row {i + 1}: Observe to Dev Q{currentQuarter}
                          </text>

                          {/* Outstanding liability value */}
                          <text x={20 + cutoffWidth - 5} y={y + 11} fontSize="8" fill="#1F2937" textAnchor="end" fontWeight="bold">
                            {(() => {
                              // Calculate outstanding liability at this development quarter
                              const observationQuarter = getQuarterInfo(endDate, claimInfo.accidentDate);
                              const targetPI = priceIndexMap ? priceIndexMap[observationQuarter.quarterKey] : null;
                              const midMap = midQuarterIndexMap || {};
                              const ultimateClaimSize = quarters.reduce((sum, q) => {
                                const srcMid = midMap[q.quarterKey] || (priceIndexMap ? priceIndexMap[q.quarterKey] : null);
                                const factor = (targetPI && srcMid) ? (targetPI / srcMid) : 1.0;
                                return sum + (q.nominalAmount || q.totalAmount) * factor;
                              }, 0);

                              let cumulativeToDate = 0;
                              for (let qIdx = 0; qIdx < quarters.length; qIdx++) {
                                const q = quarters[qIdx];
                                if (q.developmentQuarter <= currentQuarter) {
                                  const srcMid = midMap[q.quarterKey] || (priceIndexMap ? priceIndexMap[q.quarterKey] : null);
                                  const factor = (targetPI && srcMid) ? (targetPI / srcMid) : 1.0;
                                  cumulativeToDate += (q.nominalAmount || q.totalAmount) * factor;
                                }
                              }

                              const outstandingLiability = Math.max(0, ultimateClaimSize - cumulativeToDate);
                              return `Target: ${formatCurrency(outstandingLiability)}`;
                            })()}
                          </text>

                          {/* Cutoff line */}
                          <line
                            x1={20 + cutoffWidth}
                            y1={y}
                            x2={20 + cutoffWidth}
                            y2={y + rowHeight}
                            stroke="#DC2626"
                            strokeWidth="2"
                          />
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* Training Rows Table */}
                <div className="bg-white rounded border overflow-hidden">
                  <div className="bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700">Training Rows Generated</div>
                  <div className="max-h-60 overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">Row</th>
                          <th className="px-3 py-2 text-left font-medium">Description</th>
                          <th className="px-3 py-2 text-right font-medium">Total Paid to Date</th>
                          <th className="px-3 py-2 text-right font-medium">Outstanding Liability</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: validNumRows }, (_, i) => {
                          const currentQuarter = notifyQuarter + i;
                          const devPeriod = oneBasedDevQuarters ? currentQuarter + 1 : currentQuarter;

                          // Calculate outstanding liability and cumulative paid
                          const observationQuarter = getQuarterInfo(endDate, claimInfo.accidentDate);
                          const targetPI = priceIndexMap ? priceIndexMap[observationQuarter.quarterKey] : null;
                          const midMap = midQuarterIndexMap || {};
                          const ultimateClaimSize = quarters.reduce((sum, q) => {
                            const srcMid = midMap[q.quarterKey] || (priceIndexMap ? priceIndexMap[q.quarterKey] : null);
                            const factor = (targetPI && srcMid) ? (targetPI / srcMid) : 1.0;
                            return sum + (q.nominalAmount || q.totalAmount) * factor;
                          }, 0);

                          let cumulativeToDate = 0;
                          for (let qIdx = 0; qIdx < quarters.length; qIdx++) {
                            const q = quarters[qIdx];
                            if (q.developmentQuarter <= currentQuarter) {
                              const srcMid = midMap[q.quarterKey] || (priceIndexMap ? priceIndexMap[q.quarterKey] : null);
                              const factor = (targetPI && srcMid) ? (targetPI / srcMid) : 1.0;
                              cumulativeToDate += (q.nominalAmount || q.totalAmount) * factor;
                            }
                          }

                          const outstandingLiability = Math.max(0, ultimateClaimSize - cumulativeToDate);

                          return (
                            <tr key={i} className="border-t border-gray-100">
                              <td className="px-3 py-2 text-left">
                                <span className="font-mono bg-blue-100 px-2 py-1 rounded text-blue-800 text-xs">R{i + 1}</span>
                              </td>
                              <td className="px-3 py-2 text-left text-xs">
                                Claim {claimInfo.claimId} at Dev Period {devPeriod}
                              </td>
                              <td className="px-3 py-2 text-right text-gray-600">
                                {formatCurrency(cumulativeToDate)}
                              </td>
                              <td className="px-3 py-2 text-right font-medium text-red-700">
                                {formatCurrency(outstandingLiability)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
      })()}
    </div>
  );
}

// Make the component globally available
window.DevelopmentPeriodGeneration = DevelopmentPeriodGeneration;
