// QuarterlyAggregation Component
// Displays quarterly aggregation with visual bars and summary table

function QuarterlyAggregation({ quarters }) {
  // Use utilities from global scope
  const { toISODate } = window.utils;

  const maxNominalAmount = Math.max(...quarters.map(q => isNaN(q.nominalAmount) ? 0 : q.nominalAmount), 1);

  return (
    <div className="bg-yellow-50 p-4 rounded-lg">
      <div className="grid grid-cols-2 gap-6">
            {/* Left half - Visual bars */}
            <div className="space-y-2">
              <div className="text-xs font-medium text-gray-600 mb-2">Payment Composition</div>
              {quarters.map((quarter, i) => {
                const quarterNominalAmount = quarter.nominalAmount || quarter.totalAmount;
                return (
                  <div key={i} className="flex items-center gap-4 p-2 bg-white rounded border">
                    <div className="w-16 text-sm font-mono">
                      Dev Q{quarter.developmentQuarter}
                    </div>
                    <div className="w-20 text-sm">
                      {quarter.quarterKey}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 rounded overflow-hidden relative" style={{ width: `${(quarterNominalAmount / maxNominalAmount) * 100}%`, minWidth: '60px' }}>
                          {quarter.payments.map((payment, paymentIdx) => {
                            const colors = ['#fbbf24', '#f59e0b', '#d97706', '#b45309', '#92400e', '#78350f', '#451a03'];
                            const color = colors[paymentIdx % colors.length];
                            const paymentNominalAmount = payment.nominalAmount || payment.amount;
                            const paymentWidth = (paymentNominalAmount / quarterNominalAmount) * 100;
                            return (
                              <div
                                key={paymentIdx}
                                className="h-full flex items-center justify-center relative"
                                style={{
                                  backgroundColor: color,
                                  width: `${paymentWidth}%`,
                                  minWidth: '2px'
                                }}
                                title={`Payment ${paymentIdx + 1}: $${paymentNominalAmount.toFixed(2)} on ${toISODate(payment.date)}`}
                              >
                                {paymentWidth > 8 && (
                                  <span className="text-xs font-medium text-white drop-shadow-sm">
                                    ${paymentNominalAmount.toFixed(2)}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right half - Summary table */}
            <div>
              <div className="text-xs font-medium text-gray-600 mb-2">Quarterly Summary</div>
              <div className="bg-white rounded border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Quarter</th>
                      <th className="px-3 py-2 text-right font-medium">Sum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quarters.map((quarter, i) => {
                      const quarterNominalAmount = quarter.nominalAmount || quarter.totalAmount;

                      return (
                        <tr key={i} className="border-t border-gray-100">
                          <td className="px-3 py-2 font-mono">Dev Q{quarter.developmentQuarter}</td>
                          <td className="px-3 py-2 text-right font-medium">${quarterNominalAmount.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
      </div>
    </div>
  );
}

// Make the component globally available
window.QuarterlyAggregation = QuarterlyAggregation;
