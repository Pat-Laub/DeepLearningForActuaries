function PreprocessingStepsOverview({ hasInflationAdjustment }) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [activeSection, setActiveSection] = React.useState("");
  const sections = [
    { id: "static-covariates", label: "Static Info", step: 0 },
    { id: "continuous-timeline", label: "Timeline", step: 1 },
    { id: "payment-details", label: "Payments", step: 2 },
    { id: "quarterly-aggregation", label: "Quarterly Agg.", step: 3 },
    ...hasInflationAdjustment ? [{ id: "inflation-adjustment", label: "Inflation Adj.", step: 4 }] : [],
    { id: "outstanding-liability", label: "Outstanding Liability", step: hasInflationAdjustment ? 5 : 4 },
    { id: "development-period", label: "Training Rows", step: hasInflationAdjustment ? 6 : 5 },
    { id: "covariate-history", label: "Covariate History", step: hasInflationAdjustment ? 7 : 6 },
    { id: "neural-network-preprocessing", label: "Neural Network Prep", step: hasInflationAdjustment ? 8 : 7 }
  ];
  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveSection(sectionId);
    }
  };
  React.useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY + 150;
      for (let i = sections.length - 1; i >= 0; i--) {
        const element = document.getElementById(sections[i].id);
        if (element && element.offsetTop <= scrollPos) {
          setActiveSection(sections[i].id);
          break;
        }
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [hasInflationAdjustment]);
  return /* @__PURE__ */ React.createElement("div", { className: "fixed right-4 top-32 z-40" }, !isExpanded && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setIsExpanded(true),
      className: "px-3 py-2 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 transition-colors text-sm font-medium",
      title: "Show navigation"
    },
    "Steps \u2630"
  ), isExpanded && /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-lg shadow-xl border border-gray-200 p-3 w-48" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-3" }, /* @__PURE__ */ React.createElement("div", { className: "text-sm font-semibold text-gray-700" }, "Navigation"), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setIsExpanded(false),
      className: "text-gray-400 hover:text-gray-600 text-lg leading-none",
      title: "Hide navigation"
    },
    "\xD7"
  )), /* @__PURE__ */ React.createElement("div", { className: "space-y-1" }, sections.map((section) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: section.id,
      onClick: () => scrollToSection(section.id),
      className: `w-full text-left px-2 py-1.5 rounded text-xs transition-colors ${activeSection === section.id ? "bg-blue-100 text-blue-700 font-medium" : "text-gray-600 hover:bg-gray-100"}`
    },
    /* @__PURE__ */ React.createElement("span", { className: "text-gray-400 mr-1.5" }, section.step + 1, "."),
    section.label
  )))));
}
window.PreprocessingStepsOverview = PreprocessingStepsOverview;
