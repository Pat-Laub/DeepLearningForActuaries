function ContinuousTimeline({ claimInfo, selectedClaim }) {
  return /* @__PURE__ */ React.createElement("div", { className: "bg-blue-50 p-4 rounded-lg" }, /* @__PURE__ */ React.createElement("div", { className: "relative" }, /* @__PURE__ */ React.createElement("svg", { width: "100%", height: "100", viewBox: "0 0 800 100" }, (() => {
    const timelineStart = claimInfo.accidentDate;
    const timelineEnd = claimInfo.finalisationDate;
    const timelineSpan = timelineEnd.getTime() - timelineStart.getTime();
    const svgLeft = 40;
    const svgRight = 760;
    const svgWidth = svgRight - svgLeft;
    const timelineY = 40;
    const timeScale = (date) => {
      const t = date.getTime();
      return svgLeft + (t - timelineStart.getTime()) / timelineSpan * svgWidth;
    };
    const quarterBoundaries = [];
    let currentDate = new Date(timelineStart.getUTCFullYear(), 0, 1);
    while (currentDate <= timelineEnd) {
      if (currentDate >= timelineStart) {
        quarterBoundaries.push(new Date(currentDate));
      }
      const month = currentDate.getMonth();
      const nextQuarterMonth = Math.floor(month / 3) * 3 + 3;
      if (nextQuarterMonth >= 12) {
        currentDate = new Date(currentDate.getFullYear() + 1, 0, 1);
      } else {
        currentDate = new Date(currentDate.getFullYear(), nextQuarterMonth, 1);
      }
    }
    const finalBoundary = new Date(timelineEnd.getUTCFullYear() + 1, 0, 1);
    if (quarterBoundaries.length === 0 || quarterBoundaries[quarterBoundaries.length - 1] < timelineEnd) {
      quarterBoundaries.push(finalBoundary);
    }
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("line", { x1: svgLeft, y1: timelineY, x2: svgRight, y2: timelineY, stroke: "#64748b", strokeWidth: "2" }), quarterBoundaries.map((boundary, i) => {
      if (i === 0) return null;
      const prevBoundary = quarterBoundaries[i - 1];
      const x1 = timeScale(prevBoundary);
      const x2 = timeScale(boundary);
      const midX = (x1 + x2) / 2;
      const quarter = Math.floor(prevBoundary.getMonth() / 3) + 1;
      const year = prevBoundary.getFullYear();
      return /* @__PURE__ */ React.createElement("g", { key: i }, /* @__PURE__ */ React.createElement("line", { x1, y1: timelineY - 8, x2: x1, y2: timelineY + 8, stroke: "#9ca3af", strokeWidth: "1" }), boundary <= timelineEnd && /* @__PURE__ */ React.createElement("line", { x1: x2, y1: timelineY - 8, x2, y2: timelineY + 8, stroke: "#9ca3af", strokeWidth: "1" }), /* @__PURE__ */ React.createElement("text", { x: midX, y: timelineY - 12, fontSize: "9", textAnchor: "middle", fill: "#6b7280" }, year, "Q", quarter));
    }), /* @__PURE__ */ React.createElement("circle", { cx: timeScale(claimInfo.accidentDate), cy: timelineY, r: "6", fill: "#ef4444", stroke: "white", strokeWidth: "2" }), /* @__PURE__ */ React.createElement("text", { x: timeScale(claimInfo.accidentDate), y: timelineY + 20, fontSize: "10", textAnchor: "middle", fill: "#374151" }, "Accident"), /* @__PURE__ */ React.createElement("circle", { cx: timeScale(claimInfo.notifyDate), cy: timelineY, r: "5", fill: "white", stroke: "#3b82f6", strokeWidth: "2" }), /* @__PURE__ */ React.createElement("text", { x: timeScale(claimInfo.notifyDate), y: timelineY + 20, fontSize: "10", textAnchor: "middle", fill: "#374151" }, "Notify"), selectedClaim.payments.map((payment, i) => {
      const x = timeScale(payment.date);
      return /* @__PURE__ */ React.createElement("g", { key: i }, /* @__PURE__ */ React.createElement("g", { transform: `translate(${x}, ${timelineY})` }, /* @__PURE__ */ React.createElement("line", { x1: "-3", y1: "-3", x2: "3", y2: "3", stroke: "#10b981", strokeWidth: "2" }), /* @__PURE__ */ React.createElement("line", { x1: "-3", y1: "3", x2: "3", y2: "-3", stroke: "#10b981", strokeWidth: "2" })), /* @__PURE__ */ React.createElement("text", { x, y: timelineY + 20, fontSize: "9", textAnchor: "middle", fill: "#374151" }, "$", payment.amount.toFixed(2)));
    }), /* @__PURE__ */ React.createElement("g", { transform: `translate(${timeScale(claimInfo.finalisationDate)}, ${timelineY})` }, /* @__PURE__ */ React.createElement("line", { x1: "-4", y1: "-4", x2: "4", y2: "4", stroke: "#dc2626", strokeWidth: "3" }), /* @__PURE__ */ React.createElement("line", { x1: "-4", y1: "4", x2: "4", y2: "-4", stroke: "#dc2626", strokeWidth: "3" })), /* @__PURE__ */ React.createElement("text", { x: timeScale(claimInfo.finalisationDate), y: timelineY + 20, fontSize: "10", textAnchor: "middle", fill: "#374151" }, "Finalisation"));
  })())));
}
window.ContinuousTimeline = ContinuousTimeline;
