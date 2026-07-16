// StaticCovariates Component
// Displays static claim information

function StaticCovariates({ claimInfo }) {
  return (
    <div className="bg-gray-50 p-4 rounded-lg">
      <div className="text-sm font-medium mb-3">Static Covariates</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
        <div><strong>Type:</strong> {claimInfo.claimType}</div>
        <div><strong>Region:</strong> {claimInfo.region}</div>
        <div><strong>Postcode:</strong> {claimInfo.postcode}</div>
        <div><strong>Notify Lag:</strong> {claimInfo.notifyLag} quarters</div>
      </div>
    </div>
  );
}

// Make the component globally available
window.StaticCovariates = StaticCovariates;
