function PaymentDetails({
  claimInfo,
  selectedClaim,
  oneBasedDevQuarters
}) {
  const { getQuarterInfo, toISODate } = window.utils;
  return /* @__PURE__ */ React.createElement("div", { className: "bg-blue-50 p-4 rounded-lg" }, /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded border overflow-hidden" }, /* @__PURE__ */ React.createElement("table", { className: "w-full text-sm" }, /* @__PURE__ */ React.createElement("thead", { className: "bg-gray-50" }, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", { className: "px-3 py-2 text-left font-medium" }, "Event"), /* @__PURE__ */ React.createElement("th", { className: "px-3 py-2 text-left font-medium" }, "Date"), /* @__PURE__ */ React.createElement("th", { className: "px-3 py-2 text-center font-medium" }, "Calendar Quarter"), /* @__PURE__ */ React.createElement("th", { className: "px-3 py-2 text-right font-medium" }, "Amount"), /* @__PURE__ */ React.createElement("th", { className: "px-3 py-2 text-center font-medium" }, "Dev Quarter"))), /* @__PURE__ */ React.createElement("tbody", null, (() => {
    const events = [
      {
        type: "accident",
        date: claimInfo.accidentDate,
        label: "Accident",
        amount: null
      },
      {
        type: "notification",
        date: claimInfo.notifyDate,
        label: "Notification",
        amount: null
      },
      ...selectedClaim.payments.map((payment, i) => ({
        type: "payment",
        date: payment.date,
        label: `Payment #${i + 1}`,
        amount: payment.amount
      })),
      {
        type: "finalisation",
        date: claimInfo.finalisationDate,
        label: "Finalisation",
        amount: null
      }
    ];
    events.sort((a, b) => a.date.getTime() - b.date.getTime());
    return events.map((event, i) => {
      const eventQuarter = getQuarterInfo(event.date, claimInfo.accidentDate);
      const adjustedDevQuarter = eventQuarter.developmentQuarter + (oneBasedDevQuarters ? 1 : 0);
      const isEvent = event.type !== "payment";
      return /* @__PURE__ */ React.createElement("tr", { key: i, className: `border-t border-gray-100 ${isEvent ? "bg-gray-50" : ""}` }, /* @__PURE__ */ React.createElement("td", { className: `px-3 py-2 ${isEvent ? "font-medium text-gray-700" : "text-gray-600"}` }, event.label), /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2" }, toISODate(event.date)), /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2 text-center font-mono" }, eventQuarter.quarterKey), /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2 text-right font-medium" }, event.amount !== null ? `$${event.amount.toFixed(2)}` : ""), /* @__PURE__ */ React.createElement("td", { className: "px-3 py-2 text-center font-mono" }, "Q", adjustedDevQuarter));
    });
  })()))));
}
window.PaymentDetails = PaymentDetails;
