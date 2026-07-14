function StaticCovariates({ claimInfo }) {
  const [show, setShow] = React.useState(true);
  return /* @__PURE__ */ React.createElement("div", { className: "bg-gray-50 p-4 rounded-lg" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-3" }, /* @__PURE__ */ React.createElement("div", { className: "text-sm font-medium" }, "Static Covariates"), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setShow(!show),
      className: "text-xs px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded-full transition-colors"
    },
    show ? "Hide" : "Show"
  )), show && /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-2 text-sm" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("strong", null, "Type:"), " ", claimInfo.claimType), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("strong", null, "Region:"), " ", claimInfo.region), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("strong", null, "Postcode:"), " ", claimInfo.postcode), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("strong", null, "Notify Lag:"), " ", claimInfo.notifyLag, " quarters")));
}
window.StaticCovariates = StaticCovariates;
