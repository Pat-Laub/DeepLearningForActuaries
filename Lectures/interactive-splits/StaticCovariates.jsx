// StaticCovariates Component
// Displays static claim information

function StaticCovariates({ claimInfo }) {
  const [show, setShow] = React.useState(true);

  return (
    <div className="bg-gray-50 p-4 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-medium">Static Covariates</div>
        <button
          onClick={() => setShow(!show)}
          className="text-xs px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded-full transition-colors"
        >
          {show ? 'Hide' : 'Show'}
        </button>
      </div>
      {show && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
          <div><strong>Type:</strong> {claimInfo.claimType}</div>
          <div><strong>Region:</strong> {claimInfo.region}</div>
          <div><strong>Postcode:</strong> {claimInfo.postcode}</div>
          <div><strong>Notify Lag:</strong> {claimInfo.notifyLag} quarters</div>
        </div>
      )}
    </div>
  );
}

// Make the component globally available
window.StaticCovariates = StaticCovariates;
