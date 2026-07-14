function QuarterlyAggregation({ quarters }) {
  const { toISODate } = window.utils;
  const maxNominalAmount = Math.max(...quarters.map((q) => isNaN(q.nominalAmount) ? 0 : q.nominalAmount), 1);
  return /* @__PURE__ */ React.createElement("div", { className: "bg-yellow-50 p-4 rounded-lg" }, /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-6" }, /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, /* @__PURE__ */ React.createElement("div", { className: "text-xs font-medium text-gray-600 mb-2" }, "Payment Composition"), quarters.map((quarter, i) => {
    const quarterNominalAmount = quarter.nominalAmount || quarter.totalAmount;
    return /* @__PURE__ */ React.createElement("div", { key: i, className: "flex items-center gap-4 p-2 bg-white rounded border" }, /* @__PURE__ */ React.createElement("div", { className: "w-16 text-sm font-mono" }, "Dev Q", quarter.developmentQuarter), /* @__PURE__ */ React.createElement("div", { className: "w-20 text-sm" }, quarter.quarterKey), /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("div", { className: "flex h-6 rounded overflow-hidden relative", style: { width: `${quarterNominalAmount / maxNominalAmount * 100}%`, minWidth: "60px" } }, quarter.payments.map((payment, paymentIdx) => {
      const colors = ["#fbbf24", "#f59e0b", "#d97706", "#b45309", "#92400e", "#78350f", "#451a03"];
      const color = colors[paymentIdx % colors.length];
      const paymentNominalAmount = payment.nominalAmount || payment.amount;
      const paymentWidth = paymentNominalAmount / quarterNominalAmount * 100;
      return /* @__PURE__ */ React.createElement(
        "div",
        {
          key: paymentIdx,
          className: "h-full flex items-center justify-center relative",
          style: {
            backgroundColor: color,
            width: `${paymentWidth}%`,
            minWidth: "2px"
          },
          title: `Payment ${paymentIdx + 1}: $${paymentNominalAmount.toFixed(2)} on ${toISODate(payment.date)}`
        },
        paymentWidth > 8 && /* @__PURE__ */ React.createElement("span", { className: "text-xs font-medium text-white drop-shadow-sm" }, "$", paymentNominalAmount.toFixed(2))
      );
    })))));
  })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "text-xs font-medium text-gray-600 mb-2" }, "Quarterly Summary"), /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded border overflow-hidden" }, /* @__PURE__ */ React.createElement("table", { className: "w-full text-sm" }, /* @__PURE__ */ React.createElement("thead", { className: "bg-gray-50" }, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", { className: "px-3 py-2 text-left font-medium" }, "Quarter"), /* @__PURE__ */ React.createElement("th", { className: "px-3 py-2 text-right font-medium" }, "Sum"))), /* @__PURE__ */ React.createElement("tbody", null, quarters.map((quarter, i) => {
    const quarterNominalAmount = quarter.nominalAmount || quarter.totalAmount;
    return /* @__PURE__ */ React.createElement("tr", { key: i, className: "border-t border-gray-100" }, /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2 font-mono" }, "Dev Q", quarter.developmentQuarter), /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2 text-right font-medium" }, "$", quarterNominalAmount.toFixed(2)));
  })))))));
}
window.QuarterlyAggregation = QuarterlyAggregation;
