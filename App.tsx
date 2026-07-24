import { useState, useEffect, useMemo } from "react";
import { ProcessedScenario, ShipmentGroup, PrEntry, MoqAlert, ExcessMcqOverride, SurchargeRule } from "../types";
import { ShieldAlert, AlertTriangle, HelpCircle, Truck, Layers, Eye, Table, CheckSquare, Plus, Minus, Info, CheckCircle2, FileSpreadsheet, Download, RotateCcw, GripVertical, ChevronDown, ChevronUp, Pencil, X, Calendar, Trash2, Check } from "lucide-react";
import { exportCombinedExcelReport, exportSeparatedExcelZip } from "../utils/excelExport";
import { Language, t } from "../utils/translate";
import { getEffectiveMcqForColor } from "../optimizer";

interface ScenarioInspectorProps {
  scenario: ProcessedScenario;
  scenarios: ProcessedScenario[];
  exchangeRates: Record<string, number>;
  lang: Language;
  onMovePrLine?: (prId: string, targetWeek: number) => void;
  onResetOverrides?: () => void;
  hasManualOverrides?: boolean;
  matrixQtyOverrides?: Record<string, number>;
  onMatrixQtyChange?: (itemDescription: string, colorCode: string, week: number, value: number | null) => void;
  onFixUnitPrice?: (itemCode: string, colorCode: string, value: number | null | "zero") => void;
  entries?: PrEntry[];
  maxWeeks?: number;
  computedDates?: Date[];
  shipmentDates?: string[];
  setShipmentDates?: (dates: string[]) => void;
  excessOverrides?: ExcessMcqOverride[];
  setExcessOverrides?: (overrides: ExcessMcqOverride[]) => void;
  surchargeRules?: SurchargeRule[];
  mcqMoqPreferences?: Record<string, "surcharge" | "pr_file">;
  onSelectMcqMoqPreference?: (key: string, choice: "surcharge" | "pr_file") => void;
  onAcceptFlag?: (flagKey: string) => void;
}

// A small controlled/uncontrolled hybrid number input used inside the MCQ matrix cells.
// Lets the user type a replacement quantity directly (no drag-and-drop). Commits on blur
// or Enter; an empty value clears the manual override and reverts to the computed quantity.
function EditableQtyCell({
  overrideValue,
  computedQty,
  onCommit,
  disabled
}: {
  overrideValue?: number;
  computedQty: number;
  onCommit: (value: number | null) => void;
  disabled?: boolean;
}) {
  const effective = overrideValue !== undefined ? overrideValue : computedQty;
  const format = (n: number) => (n > 0 ? String(Math.round(n * 100) / 100) : "");
  const [text, setText] = useState<string>(format(effective));
  const [isFocused, setIsFocused] = useState(false);

  // Keep the field in sync if the override is cleared elsewhere (e.g. Reset Assignments)
  // or the underlying computed quantity changes — but never fight the user while they're typing.
  useEffect(() => {
    if (!isFocused) {
      setText(format(effective));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effective, isFocused]);

  const commit = () => {
    setIsFocused(false);
    const trimmed = text.trim();
    if (trimmed === "") {
      onCommit(null);
      return;
    }
    const parsed = Number(trimmed.replace(/,/g, ""));
    if (Number.isNaN(parsed) || parsed < 0) {
      // Invalid entry, revert to last known good value
      setText(format(effective));
      return;
    }
    onCommit(parsed);
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      disabled={disabled}
      value={text}
      placeholder="0"
      onChange={(e) => {
        const v = e.target.value;
        // Allow empty, digits, and a single decimal point while typing
        if (v === "" || /^[0-9]*\.?[0-9]*$/.test(v)) {
          setText(v);
        }
      }}
      onFocus={(e) => {
        setIsFocused(true);
        e.target.select();
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          (e.target as HTMLInputElement).blur();
        } else if (e.key === "Escape") {
          setText(format(effective));
          setIsFocused(false);
          (e.target as HTMLInputElement).blur();
        }
      }}
      className="w-20 text-center font-mono font-bold bg-white border border-slate-300 rounded px-1.5 py-1 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 disabled:bg-slate-100 disabled:text-slate-400"
    />
  );
}

export default function ScenarioInspector({ 
  scenario, 
  scenarios, 
  exchangeRates, 
  lang,
  onMovePrLine,
  onResetOverrides,
  hasManualOverrides,
  matrixQtyOverrides = {},
  onMatrixQtyChange,
  onFixUnitPrice,
  entries = [],
  maxWeeks = 12,
  computedDates = [],
  shipmentDates = [],
  setShipmentDates = () => {},
  excessOverrides = [],
  setExcessOverrides = () => {},
  surchargeRules = [],
  mcqMoqPreferences = {},
  onSelectMcqMoqPreference,
  onAcceptFlag
}: ScenarioInspectorProps) {
  const [activeTab, setActiveTab] = useState<"colorSummary" | "colors" | "shipmentDates" | "excess" | "shipments" | "ledger" | "requisitions">("colorSummary");
  const [draggedOverWeek, setDraggedOverWeek] = useState<number | null>(null);
  const [showConsolidated, setShowConsolidated] = useState(false);
  const [priceFixDrafts, setPriceFixDrafts] = useState<Record<string, string>>({});
  const [isExportingSeparated, setIsExportingSeparated] = useState(false);

  // State for new excess override form (relocated from AdvancedSettings, now per-scenario)
  const [newOverColor, setNewOverColor] = useState("");
  const [newOverItemCode, setNewOverItemCode] = useState("");
  const [newOverQty, setNewOverQty] = useState(0);
  const [newOverWeek, setNewOverWeek] = useState<number>(0); // 0 means auto/any week

  // Memoized unique colors and items for the selected color
  const uniqueColors = useMemo(() => {
    return Array.from(new Set(entries.map(e => e.colorCode))).sort();
  }, [entries]);

  const uniqueItems = useMemo(() => {
    if (!newOverColor) return [];
    return Array.from(new Set(
      entries.filter(e => e.colorCode === newOverColor).map(e => e.itemCode)
    )).sort();
  }, [entries, newOverColor]);

  // Sync color selection when entries change
  useEffect(() => {
    if (uniqueColors.length > 0 && (!newOverColor || !uniqueColors.includes(newOverColor))) {
      setNewOverColor(uniqueColors[0]);
    }
  }, [uniqueColors, newOverColor]);

  // Sync item selection when color changes
  useEffect(() => {
    setNewOverItemCode(""); // Default to "All Items" when color shifts
  }, [newOverColor]);

  const handleAddOverride = () => {
    if (!newOverColor) return;

    // Auto-lookup price and cbm per unit from raw entries
    const matchingPr = entries.find(e =>
      e.colorCode === newOverColor &&
      (!newOverItemCode || e.itemCode === newOverItemCode)
    );
    const pricePerUnit = matchingPr ? matchingPr.unitPrice : undefined;
    const cbmPerUnit = matchingPr && matchingPr.qty > 0 ? matchingPr.cbm / matchingPr.qty : 0.003;

    const ov: ExcessMcqOverride = {
      id: Math.random().toString(36).substring(2),
      colorCode: newOverColor,
      itemCode: newOverItemCode || undefined,
      additionalQty: newOverQty,
      pricePerUnit,
      cbmPerUnit,
      targetWeek: newOverWeek || undefined
    };
    setExcessOverrides([...excessOverrides, ov]);
    setNewOverItemCode("");
    setNewOverQty(0);
    setNewOverWeek(0);
  };

  const handleRemoveOverride = (id: string) => {
    setExcessOverrides(excessOverrides.filter(o => o.id !== id));
  };

  // Group columns (shipments)
  const shipmentColumns = scenario.shipments;
  // Item-level breakdown for the MCQ Shipment Calendar Matrix — the same
  // color code can span multiple distinct items/styles (e.g. two different
  // garment styles sharing the same dye lot color), so the matrix needs a
  // row per (item, color) pair, not just per color. Grouped by
  // itemDescription rather than itemCode, since different item codes can
  // share the same descriptive name and should be treated as one editable
  // row, not split apart. MCQ itself still applies at the color level
  // (it's a minimum dye-lot quantity, shared across every item of that
  // color), so the pass/fail check aggregates across all items sharing a
  // color — only the displayed/editable quantity is item-specific.
  const colorItemPairs = useMemo(() => {
    const seen = new Map<string, { itemDescription: string; colorCode: string }>();
    scenario.processedEntries.forEach(e => {
      const desc = e.itemDescription || e.itemCode;
      const key = `${desc}__${e.colorCode}`;
      if (!seen.has(key)) {
        seen.set(key, { itemDescription: desc, colorCode: e.colorCode });
      }
    });
    return Array.from(seen.values()).sort((a, b) => {
      if (a.colorCode !== b.colorCode) return a.colorCode.localeCompare(b.colorCode);
      return a.itemDescription.localeCompare(b.itemDescription);
    });
  }, [scenario.processedEntries]);

  // Color grouping calculations — grouped by (item description, color code)
  // pair, mirroring colorItemPairs above, so the same color code used across
  // multiple garment styles/items shows up as separate, individually
  // correctable rows instead of being merged into one color-only total.
  const colorGroupedSummary = colorItemPairs.map(({ itemDescription, colorCode }) => {
    const entries = scenario.processedEntries.filter(
      e => (e.itemDescription || e.itemCode) === itemDescription && e.colorCode === colorCode
    );
    const totalQty = entries.reduce((sum, e) => sum + e.originalQty, 0);
    const totalCbm = entries.reduce((sum, e) => sum + e.cbm, 0);
    const totalMaterialCost = entries.reduce((sum, e) => {
      const currCode = (e.currency || "").toUpperCase().trim();
      const rate = e.currencyRate !== undefined && e.currencyRate !== null
        ? e.currencyRate
        : (currCode === "THB"
            ? 1.0
            : (currCode && scenario.exchangeRates?.[currCode] !== undefined
                ? scenario.exchangeRates[currCode]
                : (e.unitPrice > 30 ? 1.0 : (scenario.exchangeRates?.["USD"] || 35.0))
              )
          );
      const priceTHB = e.unitPrice * rate;
      return sum + (e.originalQty * priceTHB);
    }, 0);
    return {
      itemDescription,
      color: colorCode,
      totalQty,
      totalCbm,
      totalMaterialCost
    };
  });

  // Helper to format Date
  const formatDate = (d?: Date) => {
    if (!d || isNaN(d.getTime()) || d.getFullYear() < 2000) return "N/A";
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const year = d.getFullYear();
    return `${month}/${day}/${year}`;
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 mb-6 border-b border-slate-100">
        <div>
          <span className="bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded text-xs font-mono font-semibold uppercase">
            Deep-Dive Inspector
          </span>
          <h2 className="text-xl font-bold text-slate-800 mt-1.5 font-sans">
            Scenario {scenario.id} {t("Detailed Breakdown", lang)}
          </h2>
          <p className="text-slate-500 text-xs mt-1">
            Analyzing {scenario.numShipments} shipments, cumulative rounding excess, and MCQ thresholds.
          </p>
        </div>

        {/* Status badges */}
        <div className="flex flex-wrap gap-2 items-center">
          {hasManualOverrides && onResetOverrides && (
            <button
              onClick={onResetOverrides}
              className="bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 font-semibold rounded-lg px-3 py-1.5 text-xs flex items-center justify-center gap-2 shadow-sm transition duration-150 cursor-pointer"
              title="Reset manual shipment date assignments back to defaults"
            >
              <RotateCcw size={13} />
              <span>Reset Assignments</span>
            </button>
          )}

          <div className="flex flex-col gap-1.5">
            <button
              onClick={() => exportCombinedExcelReport(scenario)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg px-3 py-1.5 text-xs flex items-center justify-center gap-2 shadow-sm transition duration-150 cursor-pointer"
              title="One workbook with every shipment's PR lines, ordered by PO Delivery Date"
            >
              <Download size={13} />
              <span>Download Combined Excel Report</span>
            </button>
            <button
              onClick={async () => {
                setIsExportingSeparated(true);
                try {
                  await exportSeparatedExcelZip(scenario);
                } finally {
                  setIsExportingSeparated(false);
                }
              }}
              disabled={isExportingSeparated}
              className="bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold rounded-lg px-3 py-1.5 text-xs flex items-center justify-center gap-2 shadow-sm transition duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-wait"
              title="A ZIP with one workbook per shipment (named by PO Delivery Date), listing that shipment's PR Num / PR Line"
            >
              <Download size={13} />
              <span>{isExportingSeparated ? "Zipping…" : "Download Separated Excel Report"}</span>
            </button>
          </div>

          {scenario.containerMatchingStatus === "Approved" ? (
            <div className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Container Check: Approved
            </div>
          ) : (
            <div className="bg-amber-50 text-amber-700 border border-amber-100 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5">
              <AlertTriangle size={14} className="text-amber-600 shrink-0" />
              Container Check: Manual Review Required
            </div>
          )}
        </div>
      </div>

      {/* Error and Warning Flagging Tray */}
      {scenario.errorFlags && scenario.errorFlags.length > 0 && (
        <div className="mb-6 bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
            <ShieldAlert size={14} className="text-red-500 animate-pulse" />
            Landed Logistics Flagged Events & Sanity Audits ({scenario.errorFlags.length})
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
            {scenario.errorFlags.map((flag, idx) => (
              <div 
                key={idx} 
                className={`p-2.5 rounded-lg border text-xs flex gap-2 items-start ${
                  flag.type === "error" 
                    ? "bg-red-50/75 text-red-800 border-red-100" 
                    : flag.type === "warning"
                    ? "bg-amber-50/70 text-amber-800 border-amber-100"
                    : "bg-blue-50/70 text-blue-800 border-blue-100"
                }`}
              >
                <div className="shrink-0 mt-0.5">
                  {flag.type === "error" ? (
                    <AlertTriangle size={14} className="text-red-600 animate-bounce" />
                  ) : flag.type === "warning" ? (
                    <AlertTriangle size={14} className="text-amber-600" />
                  ) : (
                    <Info size={14} className="text-blue-600" />
                  )}
                </div>
                <div>
                  <div className="font-semibold flex items-center gap-1.5">
                    <span className="uppercase text-[9px] px-1 py-0.2 bg-white/80 rounded border font-mono">
                      {flag.category}
                    </span>
                    {flag.message}
                  </div>
                  {flag.details && <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{flag.details}</p>}
                  {flag.category === "Price" && flag.itemCode && flag.colorCode && onFixUnitPrice && (() => {
                    const draftKey = `${flag.itemCode}__${flag.colorCode}`;
                    const draftVal = priceFixDrafts[draftKey] ?? "";
                    const commit = () => {
                      const parsed = parseFloat(draftVal);
                      if (!isNaN(parsed) && parsed > 0) {
                        onFixUnitPrice(flag.itemCode!, flag.colorCode!, parsed);
                        setPriceFixDrafts(prev => {
                          const copy = { ...prev };
                          delete copy[draftKey];
                          return copy;
                        });
                      }
                    };
                    return (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="New unit price"
                          value={draftVal}
                          onChange={(e) => setPriceFixDrafts(prev => ({ ...prev, [draftKey]: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === "Enter") commit(); }}
                          className="w-28 bg-white border border-amber-300 rounded px-1.5 py-1 text-[10px] font-mono text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                        <button
                          type="button"
                          onClick={commit}
                          className="text-[10px] font-semibold px-2 py-1 bg-amber-600 text-white rounded hover:bg-amber-700 transition cursor-pointer"
                        >
                          Fix Price
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (onFixUnitPrice && flag.itemCode && flag.colorCode) {
                              onFixUnitPrice(flag.itemCode, flag.colorCode, "zero");
                            }
                          }}
                          className="text-[10px] font-semibold px-2 py-1 bg-slate-200 text-slate-700 rounded hover:bg-slate-300 transition cursor-pointer"
                        >
                          {t("keep as 0", lang)}
                        </button>
                      </div>
                    );
                  })()}
                  {flag.conflictInfo && onSelectMcqMoqPreference && (
                    <div className="mt-2 pt-2 border-t border-amber-200/60 flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-semibold text-slate-600">
                        {t("Select Standard", lang)}:
                      </span>
                      <button
                        type="button"
                        onClick={() => onSelectMcqMoqPreference(flag.conflictInfo!.key, "surcharge")}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded transition cursor-pointer flex items-center gap-1 ${
                          flag.conflictInfo.activeSource === "surcharge"
                            ? "bg-amber-600 text-white shadow-sm ring-1 ring-amber-700"
                            : "bg-white text-slate-700 border border-amber-300 hover:bg-amber-100"
                        }`}
                      >
                        {flag.conflictInfo.activeSource === "surcharge" && <Check size={11} />}
                        {t("Use Surcharge Rule", lang)} ({flag.conflictInfo.surchargeValue.toLocaleString()} YD)
                      </button>
                      <button
                        type="button"
                        onClick={() => onSelectMcqMoqPreference(flag.conflictInfo!.key, "pr_file")}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded transition cursor-pointer flex items-center gap-1 ${
                          flag.conflictInfo.activeSource === "pr_file"
                            ? "bg-amber-600 text-white shadow-sm ring-1 ring-amber-700"
                            : "bg-white text-slate-700 border border-amber-300 hover:bg-amber-100"
                        }`}
                      >
                        {flag.conflictInfo.activeSource === "pr_file" && <Check size={11} />}
                        {t("Use PR File", lang)} ({flag.conflictInfo.prFileValue.toLocaleString()} YD)
                      </button>
                    </div>
                  )}
                  {flag.flagKey && flag.actionType === "accept_container_tolerance" && onAcceptFlag && (
                    <div className="mt-2 pt-2 border-t border-amber-200/60 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onAcceptFlag(flag.flagKey!)}
                        className="text-[10px] font-bold px-2.5 py-1 bg-amber-600 text-white rounded hover:bg-amber-700 shadow-sm transition cursor-pointer flex items-center gap-1"
                      >
                        <Check size={11} />
                        {t("accept", lang)}
                      </button>
                    </div>
                  )}
                  {flag.flagKey && flag.actionType === "pay_mcq_surcharge" && onAcceptFlag && (
                    <div className="mt-2 pt-2 border-t border-amber-200/60 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onAcceptFlag(flag.flagKey!)}
                        className="text-[10px] font-bold px-2.5 py-1 bg-amber-600 text-white rounded hover:bg-amber-700 shadow-sm transition cursor-pointer flex items-center gap-1"
                      >
                        <Check size={11} />
                        {t("pay for surcharge", lang)}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-100 mb-6 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("colorSummary")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition duration-150 border-b-2 -mb-px shrink-0 ${
            activeTab === "colorSummary"
              ? "border-blue-600 text-blue-600 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Table size={14} />
          {t("Grouped by Colors Summary", lang)}
        </button>
        <button
          onClick={() => setActiveTab("colors")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition duration-150 border-b-2 -mb-px shrink-0 ${
            activeTab === "colors"
              ? "border-blue-600 text-blue-600 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Layers size={14} />
          {t("MCQ Shipment Calendar Matrix", lang)}
        </button>
        <button
          onClick={() => setActiveTab("shipmentDates")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition duration-150 border-b-2 -mb-px shrink-0 ${
            activeTab === "shipmentDates"
              ? "border-blue-600 text-blue-600 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Calendar size={14} />
          {t("Ship Dates", lang)}
        </button>
        <button
          onClick={() => setActiveTab("excess")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition duration-150 border-b-2 -mb-px shrink-0 ${
            activeTab === "excess"
              ? "border-blue-600 text-blue-600 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Plus size={14} />
          {t("Excess", lang)}
        </button>
        <button
          onClick={() => setActiveTab("shipments")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition duration-150 border-b-2 -mb-px shrink-0 ${
            activeTab === "shipments"
              ? "border-blue-600 text-blue-600 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Truck size={14} />
          {t("Shipment Containers & Bins", lang)} ({shipmentColumns.length})
        </button>
        <button
          onClick={() => setActiveTab("ledger")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition duration-150 border-b-2 -mb-px shrink-0 ${
            activeTab === "ledger"
              ? "border-blue-600 text-blue-600 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <CheckSquare size={14} />
          {t("Duplicated PR Rounded Ledger", lang)}
        </button>
        <button
          onClick={() => setActiveTab("requisitions")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition duration-150 border-b-2 -mb-px shrink-0 ${
            activeTab === "requisitions"
              ? "border-blue-600 text-blue-600 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <FileSpreadsheet size={14} />
          {t("Syteline Requisition Output", lang)}
        </button>
      </div>

      {/* Tab 0: Primary Color Wise Grouping Summary */}
      {activeTab === "colorSummary" && (
        <div className="space-y-6">
          <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex gap-3 text-xs text-slate-600 leading-relaxed">
            <Info size={18} className="text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="text-blue-900 font-bold">{t("Primary Input Grouping:", lang)}</span> {t("This table groups the entire input dataset by unique colors to show the total ordered quantity, CBM, and material cost of each color before split allocations.", lang)}
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-sm">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[10px] uppercase tracking-wider">
                  <th className="py-3 px-4">Item Description</th>
                  <th className="py-3 px-4">Color Code</th>
                  <th className="py-3 px-4 text-right">Total Ordered Quantity</th>
                  <th className="py-3 px-4 text-right">Total CBM Volume</th>
                  <th className="py-3 px-4 text-right">Total Material Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {colorGroupedSummary.map(row => (
                  <tr key={`${row.itemDescription}__${row.color}`} className="hover:bg-slate-50 font-mono">
                    <td className="py-3 px-4 font-sans text-slate-600">
                      {row.itemDescription}
                    </td>
                    <td className="py-3 px-4 font-sans font-bold text-slate-800 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded border border-slate-300 inline-block" style={{
                        backgroundColor: row.color.includes("BLACK") ? "#000" : row.color.includes("BLUE") ? "#3b82f6" : row.color.includes("NAVY") ? "#1e3a8a" : "#64748b"
                      }}></span>
                      {row.color}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-700">
                      {Math.round(row.totalQty).toLocaleString()} YD
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600">
                      {row.totalCbm.toFixed(3)} CBM
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-blue-600">
                      {Math.round(row.totalMaterialCost).toLocaleString()} THB
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 1: Colors & MCQ Matrix */}
      {activeTab === "colors" && (
        <div className="space-y-6">
          <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex gap-3 text-xs text-slate-600 leading-relaxed">
            <Info size={18} className="text-blue-600 shrink-0 mt-0.5" />
            {lang === "TH" ? (
              <div>
                <span className="text-blue-900 font-bold">หลักการทำงานของตารางเมทริกซ์นี้:</span> รายการทั้งหมดจาก Syteline จะถูกจัดกลุ่มตามรหัสสีและวันที่ขนส่ง หากปริมาณรวมของสีใดสีหนึ่งต่ำกว่าเกณฑ์ขั้นต่ำ MCQ (เช่น {scenario.mcqThreshold || 500} หลา) การจัดส่งในรอบนั้นจะถูก<span className="text-amber-700 font-semibold"> ไฮไลต์สีส้มแจ้งเตือนโดยอัตโนมัติ</span> และปริมาณจะถูก<span className="text-blue-600 font-semibold"> ดึงไปจัดส่งเร็วขึ้น</span> (รวมเข้ากับสัปดาห์ก่อนหน้า) หรือปัดเศษเพิ่มขึ้นในรอบแรกพร้อมคิด<span className="text-emerald-600 font-semibold"> ค่าธรรมเนียมส่วนต่างขั้นต่ำในสัปดาห์ที่ 1</span> เพื่อหลีกเลี่ยงค่าปรับยอดสั่งสั่งผลิตต่ำกว่าเกณฑ์ขั้นต่ำจากโรงงาน
              </div>
            ) : (
              <div>
                <span className="text-blue-900 font-bold">How this matrix works:</span> All Syteline entries are grouped by color code and shipment date.
                If a color's total quantity falls below the MCQ threshold (e.g., {scenario.mcqThreshold || 500} YD), that column's shipment is automatically
                <span className="text-amber-700 font-semibold"> highlighted</span> and the quantity is either
                <span className="text-blue-600 font-semibold"> moved earlier</span> (consolidated to previous week) or met with a
                <span className="text-emerald-600 font-semibold"> shipment 1 rounding surcharge</span> to avoid factory minimum penalties.
                {" "}Click any quantity cell to <span className="text-slate-900 font-semibold">type in a corrected number</span> — your edits are saved per scenario and the MCQ status recalculates instantly.
              </div>
            )}
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-sm">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[10px] uppercase tracking-wider">
                  <th className="py-3 px-4">Item Description</th>
                  <th className="py-3 px-4">Color Code</th>
                  <th className="py-3 px-4 text-center">MCQ Limit</th>
                  {shipmentColumns.map((col, idx) => (
                    <th key={idx} className="py-3 px-4 text-center">
                      Shipment {idx + 1}
                      <div className="text-[9px] font-mono font-normal text-slate-400 normal-case mt-0.5">
                        {formatDate(col.shipmentDate || col.date)}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {colorItemPairs.map(({ itemDescription, colorCode }) => {
                  const itemColorEntries = scenario.processedEntries.filter(p => (p.itemDescription || p.itemCode) === itemDescription && p.colorCode === colorCode);
                  const siblingItems = colorItemPairs.filter(p => p.colorCode === colorCode);
                  const colorVendor = itemColorEntries[0]?.vendor || entries?.find(e => e.colorCode === colorCode)?.vendor;
                  const colorAlert = scenario.moqAlerts.find(a => a.colorCode === colorCode);
                  const limit = colorAlert?.targetMoq || getEffectiveMcqForColor(colorCode, colorVendor, surchargeRules, scenario.mcqThreshold || 500);

                  return (
                    <tr key={`${itemDescription}__${colorCode}`} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-sans text-slate-600 text-[11px] max-w-[220px] align-top">
                        {itemDescription}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-800 align-top">
                        <span className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded border border-slate-300 inline-block shrink-0" style={{
                            backgroundColor: colorCode === "COL-RED" ? "#ef4444" : colorCode === "COL-BLU" ? "#3b82f6" : "#475569"
                          }}></span>
                          {colorCode}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-semibold text-slate-500 align-top">
                        {limit.toLocaleString()}
                      </td>
                      {shipmentColumns.map((col, colIdx) => {
                        // This item's own PRs for this week
                        const weekPrs = itemColorEntries.filter(p => p.assignedWeek === col.week);
                        const qty = weekPrs.reduce((sum, p) => sum + p.qty, 0);
                        const originalQty = weekPrs.reduce((sum, p) => sum + p.originalQty, 0);

                        // Manual override — keyed per itemDescription+color+week
                        // so editing one item never affects a different item
                        // that happens to share the same color, while items
                        // sharing the same description are still treated as
                        // one combined row.
                        const cellKey = `${itemDescription}__${colorCode}__${col.week}`;
                        const hasOverride = Object.prototype.hasOwnProperty.call(matrixQtyOverrides, cellKey);
                        const overrideVal = matrixQtyOverrides[cellKey];
                        const effectiveQty = hasOverride ? overrideVal : qty;

                        // MCQ pass/fail is evaluated at the COLOR level —
                        // the aggregate across every item sharing this
                        // color for this week — since MCQ represents a
                        // minimum dye-lot quantity, not a per-item/style
                        // minimum. Only the displayed/editable number above
                        // is item-specific.
                        const colorWeekEffectiveTotal = siblingItems.reduce((sum, p) => {
                          const pKey = `${p.itemDescription}__${colorCode}__${col.week}`;
                          if (Object.prototype.hasOwnProperty.call(matrixQtyOverrides, pKey)) {
                            return sum + matrixQtyOverrides[pKey];
                          }
                          const pQty = scenario.processedEntries
                            .filter(e => (e.itemDescription || e.itemCode) === p.itemDescription && e.colorCode === colorCode && e.assignedWeek === col.week)
                            .reduce((s, e) => s + e.qty, 0);
                          return sum + pQty;
                        }, 0);

                        // Check if we had an MOQ alert/movement for this color and week
                        const isMoved = scenario.moqAlerts.some(a => a.colorCode === colorCode && a.week === col.week && a.moved);
                        const isSurcharged = scenario.moqAlerts.some(a => a.colorCode === colorCode && a.week === col.week && !a.moved);

                        let cellClass = "py-3 px-4 text-center font-mono ";
                        let badge = null;

                        if (effectiveQty > 0 && colorWeekEffectiveTotal > 0 && colorWeekEffectiveTotal < limit && colIdx === 0) {
                          // Under MCQ on Shipment 1 (surcharge added!)
                          cellClass += "bg-red-50 text-red-800 border border-red-200 font-bold";
                          badge = (
                            <span className="block text-[8px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded uppercase mt-1 font-sans tracking-wide">
                              need surcharge (MCQ)
                            </span>
                          );
                        } else if (colorWeekEffectiveTotal === 0 && isMoved && !hasOverride) {
                          // Had quantity but got shifted earlier
                          cellClass += "bg-amber-50 text-amber-700/70 border border-dashed border-amber-200";
                          badge = (
                            <span className="block text-[8px] bg-amber-100 text-amber-800 px-1 py-0.5 rounded uppercase mt-1 font-sans tracking-wide">
                              Below MCQ → Moved Earlier
                            </span>
                          );
                        } else if (colorWeekEffectiveTotal >= limit) {
                          // Met MCQ perfectly (color-wide)
                          cellClass += "text-emerald-600 font-semibold";
                        } else if (effectiveQty > 0 && colorWeekEffectiveTotal > 0 && colorWeekEffectiveTotal < limit) {
                          // Below MCQ threshold on a later shipment (either flagged by the
                          // optimizer, or newly below-threshold because of a manual edit)
                          cellClass += "bg-red-50 text-red-700 border border-red-200 font-semibold";
                          badge = (
                            <span className="block text-[8px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded uppercase mt-1 font-sans tracking-wide">
                              {isSurcharged ? "need surcharge (MCQ)" : "below MCQ threshold"}
                            </span>
                          );
                        } else {
                          cellClass += "text-slate-500";
                        }

                        return (
                          <td key={colIdx} className={cellClass + " align-top relative"}>
                            <div className="flex flex-col items-center gap-1">
                              <div className="flex items-center gap-1">
                                <EditableQtyCell
                                  overrideValue={hasOverride ? overrideVal : undefined}
                                  computedQty={qty}
                                  disabled={!onMatrixQtyChange}
                                  onCommit={(value) => onMatrixQtyChange && onMatrixQtyChange(itemDescription, colorCode, col.week, value)}
                                />
                                {hasOverride && onMatrixQtyChange && (
                                  <button
                                    type="button"
                                    title="Clear manual edit and revert to computed quantity"
                                    onClick={() => onMatrixQtyChange(itemDescription, colorCode, col.week, null)}
                                    className="text-slate-400 hover:text-red-600 transition shrink-0 cursor-pointer"
                                  >
                                    <X size={12} />
                                  </button>
                                )}
                              </div>
                              {(qty > 0 || hasOverride) && (
                                <span className="text-[10px] text-slate-400">Original Qty: {originalQty.toFixed(1)}</span>
                              )}
                              {hasOverride && (
                                <span className="flex items-center gap-0.5 text-[8px] text-blue-600 font-sans font-semibold uppercase tracking-wide">
                                  <Pencil size={8} /> edited
                                </span>
                              )}
                              {badge}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Order-level MOQ Status Banner */}
          {(() => {
            const totalOrderQty = scenario.processedEntries.reduce((sum, p) => sum + p.qty, 0);
            const orderMoq = scenario.moqThreshold || 3000;
            const isMoqMet = totalOrderQty >= orderMoq;
            const pct = Math.min(100, (totalOrderQty / orderMoq) * 100);

            return (
              <div className={`p-4 rounded-xl border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shadow-sm transition-all ${
                isMoqMet 
                  ? "bg-emerald-50/60 border-emerald-100 text-emerald-900" 
                  : "bg-amber-50 border-amber-100 text-amber-900"
              }`}>
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    {isMoqMet ? (
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                        MOQ Met
                      </span>
                    ) : (
                      <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase animate-pulse">
                        MOQ Not Met
                      </span>
                    )}
                    <span className="font-bold text-sm">
                      {isMoqMet ? "Order-Level MOQ Target Achieved" : "Order-Level MOQ Target Not Met"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {isMoqMet 
                      ? `The entire order total is fully compliant with the minimum order quantity requirement (Target: ${orderMoq.toLocaleString()} YD, Actual: ${Math.round(totalOrderQty).toLocaleString()} YD).`
                      : `The entire order falls short of the required minimum order quantity of ${orderMoq.toLocaleString()} YD by ${(orderMoq - totalOrderQty).toFixed(0)} YD. Applied surcharges at individual color/PO level.`
                    }
                  </p>
                </div>

                <div className="flex flex-col items-start md:items-end gap-1 font-mono shrink-0">
                  <div className="text-xs font-semibold text-slate-500">
                    Order MOQ Ratio
                  </div>
                  <div className="text-lg font-extrabold text-slate-800">
                    {Math.round(totalOrderQty).toLocaleString()} / {orderMoq.toLocaleString()} YD
                  </div>
                  <div className="w-full md:w-32 bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
                    <div 
                      className={`h-full transition-all duration-500 ${isMoqMet ? "bg-emerald-500" : "bg-amber-500"}`} 
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Warnings Log */}
          {scenario.moqAlerts.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <ShieldAlert className="text-amber-600" size={16} />
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Automated MOQ Optimization Logs
                </span>
              </div>
              <div className="space-y-1.5">
                {scenario.moqAlerts.map((alert, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-4 text-[11px] bg-white border border-slate-200 p-2 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                      <span className="font-mono text-blue-600 font-semibold">{alert.colorCode}</span>
                      <span className="text-slate-500">Shipment {alert.week} quantity</span>
                      <span className="font-mono bg-slate-50 text-slate-700 px-1 py-0.5 rounded border border-slate-100">
                        {alert.originalQty.toFixed(1)} YD
                      </span>
                      <span className="text-slate-500">was below MCQ limit of</span>
                      <span className="font-mono bg-slate-50 text-slate-700 px-1 py-0.5 rounded border border-slate-100">
                        {alert.targetMoq} YD
                      </span>
                    </div>

                    <div className="shrink-0">
                      {alert.moved ? (
                        <span className="bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded font-mono text-[9px] font-bold">
                          Moved to Shipment {alert.movedToWeek}
                        </span>
                      ) : (
                        <span className="bg-red-50 text-red-700 border border-red-200 px-2 py-1 rounded font-mono text-[9px] font-bold block text-right leading-tight">
                          <span className="block">Shipment {alert.week} MCQ Surcharge Added {alert.surchargeAmount !== undefined ? `${alert.surchargeAmount.toFixed(2)} USD` : ''}</span>
                          {alert.surchargeRuleApplied ? (
                            <span className="block text-[8px] font-normal text-slate-500 mt-0.5 font-sans">
                              [Rule: {alert.surchargeRuleApplied} ({alert.surchargeRateApplied})]
                            </span>
                          ) : null}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Manual Shipment Date Overrides (per-scenario) */}
      {activeTab === "shipmentDates" && (
        <div className="space-y-4">
          <div className="bg-blue-50/70 border border-blue-100 p-3.5 rounded-xl text-[11px] text-slate-600 leading-relaxed flex gap-2.5 shadow-sm">
            <Calendar size={15} className="text-blue-600 shrink-0 mt-0.5" />
            <div>
              <strong>{t("Manual Shipment Date Overrides:", lang)}</strong> {t("By default, shipment dates are dynamically calculated by grouping PRs into natural gaps, finding the earliest PR Due Date per group, subtracting transit time, and snapping backwards to the allowed Loading Departure Days. You can manually override the computed departure date for any specific shipment group below.", lang)}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3 bg-slate-50 border border-slate-100 p-3 rounded-xl max-h-[400px] overflow-y-auto">
            {Array.from({ length: scenario.shipments.length }, (_, i) => i + 1).map((w) => {
              // Local-time-safe date formatting for <input type="date">
              // (YYYY-MM-DD). toISOString() converts to UTC first, which
              // silently shows the wrong day for timezones ahead of UTC
              // (e.g. Bangkok, UTC+7) — a local midnight date can roll back
              // to the previous day once converted to UTC.
              const toDateInputValue = (d: Date) => {
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, "0");
                const day = String(d.getDate()).padStart(2, "0");
                return `${year}-${month}-${day}`;
              };
              const computedDateStr = computedDates[w - 1] ? toDateInputValue(computedDates[w - 1]) : "";
              // Show the computed date directly in the field by default so
              // the user can see it at a glance — but this is purely a
              // display fallback. shipmentDates itself stays untouched
              // until the user actually edits the field via onChange, so
              // the dynamic per-group calculation keeps driving the real
              // value unless explicitly overridden.
              const dateVal = shipmentDates[w - 1] || computedDateStr;
              return (
                <div key={w} className="space-y-1.5 bg-white p-3 rounded-lg border border-slate-200/60 shadow-xs">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    {lang === "TH" ? `วันเดินเรือชิปเมนต์ที่ ${w}` : `Shipment ${w} Date`}
                  </label>
                  <input
                    type="date"
                    value={dateVal}
                    onChange={(e) => {
                      const newDates = [...shipmentDates];
                      newDates[w - 1] = e.target.value;
                      setShipmentDates(newDates);
                    }}
                    className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-700 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
                  />
                  <div className="flex justify-between items-center text-[9px]">
                    <span className="text-slate-400 font-medium">
                      {lang === "TH" ? `ชิปเมนต์กลุ่มที่ ${w}` : `Shipment Group ${w}`}
                    </span>
                    {computedDateStr && !shipmentDates[w - 1] && (
                      <span className="text-blue-500 font-mono" title="Dynamically Computed Baseline Date — edit above to override">
                        Computed: {computedDateStr}
                      </span>
                    )}
                    {shipmentDates[w - 1] && (
                      <span className="text-amber-600 font-mono font-semibold" title="Manually overridden">
                        Manual override
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab: Excess MCQ / MOQ Manual Overrides (per-scenario) */}
      {activeTab === "excess" && (() => {
        const matchingPr = entries.find(e =>
          e.colorCode === newOverColor &&
          (!newOverItemCode || e.itemCode === newOverItemCode)
        );
        const foundUnitPrice = matchingPr ? matchingPr.unitPrice : 0;
        const foundCbmPerUnit = matchingPr && matchingPr.qty > 0 ? matchingPr.cbm / matchingPr.qty : 0.003;

        return (
          <div className="space-y-4">
            <div className="bg-violet-50 border border-violet-100 p-3 rounded-lg text-[11px] text-slate-600 leading-relaxed">
              <strong>{t("Excess MCQ Overrides:", lang)}</strong> {t("Select a color and optionally a specific item, then specify the additional quantity to add. Price and CBM per unit are automatically retrieved from the dataset to ensure total landed cost and volume update correctly.", lang)}
            </div>

            <div className="space-y-2.5 bg-slate-50 border border-slate-100 p-3 rounded-lg">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{t("Inject Order Padding Override", lang)}</span>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-[9px] font-semibold text-slate-500 mb-1">{t("Color Code", lang)}</label>
                  <select
                    value={newOverColor}
                    onChange={e => setNewOverColor(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {uniqueColors.length === 0 ? (
                      <option value="">No colors available</option>
                    ) : (
                      uniqueColors.map(color => (
                        <option key={color} value={color}>{color}</option>
                      ))
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-semibold text-slate-500 mb-1">{t("Item Code (Optional)", lang)}</label>
                  <select
                    value={newOverItemCode}
                    onChange={e => setNewOverItemCode(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">{t("All Items under Color", lang)}</option>
                    {uniqueItems.map(item => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-semibold text-slate-500 mb-1">{t("Target Shipment", lang)}</label>
                  <select
                    value={newOverWeek}
                    onChange={e => setNewOverWeek(parseInt(e.target.value) || 0)}
                    className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="0">{t("Auto / Under MCQ", lang)}</option>
                    {Array.from({ length: scenario.shipments.length }, (_, i) => i + 1).map((w) => (
                      <option key={w} value={w}>
                        {lang === "TH" ? `ชิปเมนต์ ${w}` : `Shipment ${w}`}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-[9px] font-semibold text-slate-500 mb-1">{t("Additional Qty (YD)", lang)}</label>
                  <input
                    type="number"
                    value={newOverQty || ""}
                    onChange={e => setNewOverQty(parseInt(e.target.value) || 0)}
                    placeholder="e.g. 500"
                    className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs font-mono text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Auto-Looked Up Display Fields */}
                <div className="col-span-2 grid grid-cols-2 gap-3 bg-violet-100/40 p-2.5 rounded-lg border border-violet-200/50 mt-1">
                  <div>
                    <span className="text-slate-400 block uppercase font-bold text-[8px] tracking-wider mb-0.5">{t("Retrieved Unit Price", lang)}</span>
                    <span className="font-mono text-violet-800 font-semibold text-xs">
                      {foundUnitPrice > 0
                        ? (foundUnitPrice > 30 ? `${foundUnitPrice.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})} THB` : `$${foundUnitPrice.toFixed(2)} USD`)
                        : "N/A"
                      }
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block uppercase font-bold text-[8px] tracking-wider mb-0.5">{t("Retrieved CBM per YD", lang)}</span>
                    <span className="font-mono text-violet-800 font-semibold text-xs">
                      {matchingPr ? `${foundCbmPerUnit.toFixed(5)} CBM` : "0.00300 CBM (Default)"}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleAddOverride}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white rounded py-1.5 text-xs font-semibold mt-2 cursor-pointer transition flex items-center justify-center gap-1"
              >
                <Plus size={12} /> {t("Add Padding Override", lang)}
              </button>
            </div>

            {excessOverrides.length > 0 && (
              <div className="border border-slate-100 rounded-lg overflow-hidden mt-3">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-400 font-bold text-[10px] uppercase">
                    <tr>
                      <th className="p-2">{t("Color / Item", lang)}</th>
                      <th className="p-2">{t("Target", lang)}</th>
                      <th className="p-2 text-right">{t("Padded Qty", lang)}</th>
                      <th className="p-2 text-right">{t("Price", lang)}</th>
                      <th className="p-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {excessOverrides.map(o => (
                      <tr key={o.id} className="text-slate-600 hover:bg-slate-50">
                        <td className="p-2 font-medium">
                          <div className="truncate max-w-[120px]">{o.colorCode}</div>
                          {o.itemCode && <div className="text-[9px] text-slate-400 font-mono">{o.itemCode}</div>}
                        </td>
                        <td className="p-2 font-mono text-slate-500">
                          {o.targetWeek ? `${t("Week", lang)} ${o.targetWeek}` : t("Auto / Under MCQ", lang)}
                        </td>
                        <td className="p-2 text-right font-mono text-violet-600 font-bold">+{o.additionalQty} YD</td>
                        <td className="p-2 text-right font-mono">${o.pricePerUnit?.toFixed(2) || "Default"}</td>
                        <td className="p-2">
                          <button
                            onClick={() => handleRemoveOverride(o.id)}
                            className="text-red-500 hover:text-red-700 transition cursor-pointer"
                          >
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })()}

      {/* Tab 2: Shipment Group Details */}
      {activeTab === "shipments" && (
        <div className="space-y-6">
          <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex gap-3 text-xs text-slate-600 leading-relaxed">
            <Info size={18} className="text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="text-blue-900 font-bold">Interactive Shipment Planning:</span> Drag and drop any materials between shipment cards to reschedule them manually, or use the drop-down selector on each line. The logistics engine will instantly re-calculate ocean freight container packing, MCQ surcharges, carrying penalties, and total landed costs!
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {shipmentColumns.map((ship, idx) => {
              const isLcl = ship.container.isLcl;

              return (
                <div 
                  key={idx} 
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (draggedOverWeek !== ship.week) {
                      setDraggedOverWeek(ship.week);
                    }
                  }}
                  onDragLeave={() => {
                    setDraggedOverWeek(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDraggedOverWeek(null);
                    const prId = e.dataTransfer.getData("text/plain");
                    if (prId && onMovePrLine) {
                      onMovePrLine(prId, ship.week);
                    }
                  }}
                  className={`bg-slate-50/50 border rounded-xl p-5 shadow-sm flex flex-col justify-between transition-all duration-200 ${
                    draggedOverWeek === ship.week
                      ? "border-blue-500 ring-4 ring-blue-500/10 bg-blue-50/30 scale-[1.01]"
                      : "border-slate-200"
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                          SHIPMENT {idx + 1}
                        </span>
                        <h4 className="text-base font-bold text-slate-800 mt-1">
                          Shipment Date: {formatDate(ship.shipmentDate || ship.date)}
                        </h4>
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                        isLcl ? "bg-amber-50 text-amber-700 border border-amber-100" : "bg-blue-50 text-blue-700 border border-blue-100"
                      }`}>
                        {isLcl ? "LCL Cargo" : "FCL Cargo"}
                      </span>
                    </div>

                    <div className="bg-white border border-slate-200 p-3.5 rounded-lg mb-4">
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        Assigned Containers
                      </div>
                      <div className="text-sm font-bold text-slate-800 font-mono mt-1">
                        {ship.container.name}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Total Volume: {ship.totalCbm.toFixed(3)} CBM | Quantity: {Math.round(ship.totalQty).toLocaleString()} YD
                      </div>

                      {ship.container.status && (
                        <div className={`mt-2.5 p-2 rounded text-[11px] leading-relaxed flex items-start gap-1.5 border ${
                          ship.container.status === "NOT Acceptable"
                            ? "bg-rose-50 text-rose-800 border-rose-200"
                            : ship.container.status === "Review Needed"
                            ? "bg-amber-50 text-amber-800 border-amber-200"
                            : "bg-emerald-50 text-emerald-800 border-emerald-200"
                        }`}>
                          {ship.container.status === "NOT Acceptable" ? (
                            <AlertTriangle size={13} className="text-rose-600 shrink-0 mt-0.5" />
                          ) : ship.container.status === "Review Needed" ? (
                            <AlertTriangle size={13} className="text-amber-600 shrink-0 mt-0.5" />
                          ) : (
                            <CheckCircle2 size={13} className="text-emerald-600 shrink-0 mt-0.5" />
                          )}
                          <span>
                            <strong className="font-semibold">{ship.container.status}:</strong> {ship.container.statusDetails}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Cost Breakdown */}
                    <div className="space-y-2 border-t border-slate-200 pt-4 text-xs mb-4">
                      <div className="flex justify-between text-slate-500">
                        <span>Ocean Freight Tariff:</span>
                        <span className="font-mono text-slate-700">{Math.round(ship.freightCost).toLocaleString()} THB</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Local Port Dues & Delivery:</span>
                        <span className="font-mono text-slate-700">{Math.round(ship.localCost).toLocaleString()} THB</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Customs Brokerage Dues:</span>
                        <span className="font-mono text-slate-700">{Math.round(ship.brokerageCost).toLocaleString()} THB</span>
                      </div>
                      <div className="flex justify-between text-slate-500 group relative">
                        <span className="flex items-center gap-1 cursor-help border-b border-dotted border-slate-400">
                          Carrying Cost Penalty:
                          <span className="invisible group-hover:visible absolute left-0 bottom-6 z-10 w-64 p-2 bg-slate-800 text-white text-[10px] rounded-lg shadow-lg leading-normal">
                            Formula: (Shipment Value ÷ 2) × Carrying Rate × (Days Early / 365)<br/>
                            <span className="text-slate-300 font-mono">Shipment Value = Material Cost + MOQ Excess Cost</span>
                          </span>
                        </span>
                        <span className="font-mono text-slate-700">{Math.round(ship.carryingCost).toLocaleString()} THB</span>
                      </div>
                      <div className="flex justify-between text-slate-500 group relative">
                        <span className="flex items-center gap-1 cursor-help border-b border-dotted border-slate-400">
                          Capital Opportunity Cost:
                          <span className="invisible group-hover:visible absolute left-0 bottom-6 z-10 w-64 p-2 bg-slate-800 text-white text-[10px] rounded-lg shadow-lg leading-normal">
                            Formula: Shipment Value × [ (1 + Opportunity Rate)^(Days Early / 365) − 1 ]<br/>
                            <span className="text-slate-300 font-mono">Opportunity Rate = WACC %</span>
                          </span>
                        </span>
                        <span className="font-mono text-slate-700">{Math.round(ship.opportunityCost).toLocaleString()} THB</span>
                      </div>
                      <div className="flex justify-between font-bold border-t border-slate-200 pt-2 text-blue-600">
                        <span>Subtotal Cost:</span>
                        <span className="font-mono">{Math.round(ship.totalLandedCost).toLocaleString()} THB</span>
                      </div>
                    </div>
                  </div>

                  {/* Shipment items list */}
                  <div className="border-t border-slate-200 pt-4">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                      Consolidated Materials ({ship.items.length})
                    </span>
                    <div className="max-h-48 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                      {ship.items.map((item, itemIdx) => (
                        <div 
                          key={item.id || itemIdx} 
                          draggable={true}
                          onDragStart={(e) => {
                            e.dataTransfer.setData("text/plain", item.id);
                          }}
                          className="bg-white border border-slate-200 hover:border-blue-300 p-2 rounded flex justify-between items-center text-[11px] font-mono text-slate-700 hover:bg-blue-50/20 active:cursor-grabbing hover:cursor-grab transition duration-150 group"
                        >
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <span className="text-slate-400 shrink-0 cursor-grab hover:text-blue-500" title="Drag to reschedule">
                              <GripVertical size={13} />
                            </span>
                            <span className="text-slate-500 truncate max-w-[12rem]" title={item.itemDescription || item.itemCode}>
                              {item.id}: {item.itemCode}
                            </span>
                            <span className="bg-slate-100 text-slate-600 px-1 py-0.2 rounded text-[9px] shrink-0 font-bold uppercase">
                              {item.colorCode}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className="text-slate-800 font-bold whitespace-nowrap">{Math.round(item.qty).toLocaleString()} YD</span>
                            
                            {onMovePrLine && scenario.weeks.length > 1 && (
                              <select
                                value={ship.week}
                                onChange={(e) => {
                                  const targetW = parseInt(e.target.value, 10);
                                  if (targetW !== ship.week) {
                                    onMovePrLine(item.id, targetW);
                                  }
                                }}
                                className="bg-slate-50 border border-slate-200 text-[10px] text-slate-600 rounded px-1.5 py-0.5 ml-1 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer hover:bg-slate-100"
                                title="Reschedule to shipment week"
                              >
                                {scenario.weeks.map(w => (
                                  <option key={w} value={w}>
                                    S{w}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 3: Duplicate PR Rounded Ledger */}
      {activeTab === "ledger" && (
        <div className="space-y-4">
          <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex gap-3 text-xs text-slate-600 leading-relaxed">
            <CheckSquare size={18} className="text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="text-blue-900 font-bold">{t("Final Mapped Syteline Planning Sheet (Duplicated & Balanced):", lang)}</span> {t("This duplicate PR ledger reflects the exact rounded integer purchase quantities, adjusted proportionate CBM volumes, and actual financial Carrying & Capital opportunity penalty costs for each entry. Rounding or MCQ/MOQ excess is automatically compiled and added directly to the latest entry on that shipment date as required.", lang)}
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-sm">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[10px] uppercase tracking-wider">
                  <th className="py-3 px-3">PR ID</th>
                  <th className="py-3 px-3">Item Code</th>
                  <th className="py-3 px-3">Color</th>
                  <th className="py-3 px-3 text-right">Original Qty</th>
                  <th className="py-3 px-3 text-right">Final Qty</th>
                  <th className="py-3 px-3 text-center">Rounding/MOQ Excess</th>
                  <th className="py-3 px-3 text-right">Price</th>
                  <th className="py-3 px-3 text-center">PR Due Date</th>
                  <th className="py-3 px-3 text-center">PO Due Date</th>
                  <th className="py-3 px-3 text-center">Days Early</th>
                  <th className="py-3 px-3 text-right">Volume (CBM)</th>
                  <th className="py-3 px-3 text-right">Material Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {scenario.processedEntries.map((pr, idx) => {
                  const excess = (pr.excessQty || 0);
                  const isPositiveExcess = excess > 0.0001;
                  const isNegativeExcess = excess < -0.0001;

                  return (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-mono text-slate-400 font-medium">
                        {pr.id}
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-700">
                        {pr.itemCode}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-500">
                        {pr.colorCode}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-500">
                        {pr.originalQty.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-800">
                        {pr.qty.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {isPositiveExcess ? (
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded font-mono text-[10px] font-semibold inline-flex items-center gap-0.5">
                            <Plus size={10} /> {excess.toFixed(2)}
                          </span>
                        ) : isNegativeExcess ? (
                          <span className="bg-red-50 text-red-700 border border-red-100 px-2 py-0.5 rounded font-mono text-[10px] font-semibold inline-flex items-center gap-0.5">
                            <Minus size={10} /> {Math.abs(excess).toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-slate-300 font-mono">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-500">
                        {pr.unitPrice.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-slate-500">
                        {formatDate(pr.dueDateRaw || pr.prDueDate)}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-blue-600 font-semibold">
                        {formatDate(pr.poDueDate)}
                      </td>
                      <td className={`py-3 px-3 text-center font-mono font-bold ${
                        (pr.daysEarly || 0) < 0 ? "text-red-600 font-bold" : (pr.daysEarly || 0) > 0 ? "text-slate-500" : "text-emerald-700 font-black"
                      }`}>
                        {pr.daysEarly} days
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-500">
                        {pr.cbm.toFixed(4)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-600">
                        {(() => {
                          const currCode = (pr.currency || "").toUpperCase().trim();
                          const rate = pr.currencyRate !== undefined && pr.currencyRate !== null
                            ? pr.currencyRate
                            : (currCode === "THB"
                                ? 1.0
                                : (currCode && scenario.exchangeRates?.[currCode] !== undefined
                                    ? scenario.exchangeRates[currCode]
                                    : (pr.unitPrice > 30 ? 1.0 : (scenario.exchangeRates?.["USD"] || 35.0))
                                  )
                              );
                          return (pr.qty * pr.unitPrice * rate).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
                        })()} THB
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Syteline Requisition & Line Columns Output */}
      {activeTab === "requisitions" && (
        <div className="space-y-4">
          <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-4 flex gap-3 text-xs text-slate-700 leading-relaxed">
            <CheckSquare size={18} className="text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="text-emerald-900 font-bold">Official Requisition Mapping Worksheet:</span> Below is the official compiled Syteline Requisition schedule for <strong>Scenario {scenario.id}</strong>. In keeping with Syteline standards, we output the <strong>Requisition</strong> and <strong>Line</strong> columns mapped alongside their optimized quantities and delivery structures.
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-sm">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[10px] uppercase tracking-wider">
                  <th className="py-3 px-4">Requisition No.</th>
                  <th className="py-3 px-4 text-center">Line No.</th>
                  <th className="py-3 px-4">Item Code</th>
                  <th className="py-3 px-4">Color Description</th>
                  <th className="py-3 px-4 text-right">Optimized Qty</th>
                  <th className="py-3 px-4 text-center">UOM</th>
                  <th className="py-3 px-4 text-center">PO Delivery Date</th>
                  <th className="py-3 px-4 text-center">PR Due Date</th>
                  <th className="py-3 px-4 text-center">Days Early</th>
                  <th className="py-3 px-4 text-center">PR Delivery Date (Vendor Loading)</th>
                  <th className="py-3 px-4 text-center">PO Due Date (Arrival at VT)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(() => {
                  // Determine loading date according to shipping rules
                  const getVendorLoadingDate = (shipmentDate: Date, origin: string): Date => {
                    const dateCopy = new Date(shipmentDate);
                    const originUpper = origin.toUpperCase();
                    
                    if (originUpper.includes("TAIWAN") || originUpper.includes("KEELUNG")) {
                      // Taiwan Keelung: Tuesday and Friday.
                      const day = dateCopy.getDay(); // 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday
                      if (day === 2 || day === 5) return dateCopy;
                      while (dateCopy.getDay() !== 2 && dateCopy.getDay() !== 5) {
                        dateCopy.setDate(dateCopy.getDate() - 1);
                      }
                      return dateCopy;
                    } else {
                      // Other Countries: Monday.
                      const day = dateCopy.getDay();
                      if (day === 1) return dateCopy;
                      while (dateCopy.getDay() !== 1) {
                        dateCopy.setDate(dateCopy.getDate() - 1);
                      }
                      return dateCopy;
                    }
                  };

                  return scenario.processedEntries.map((pr, idx) => {
                    // Derive shipping date associated with the assigned week
                    const shipmentGroup = scenario.shipments.find(s => s.week === pr.assignedWeek);
                    const shipmentDate = shipmentGroup?.shipmentDate || new Date();
                    const loadingDate = pr.actualDelivery || pr.prDueDate; // PR Delivery Date (Vendor Loading) — the ex-port ship date

                    // Requisition usually uses the PR row ID or the PR document
                    const requisitionNo = pr.id;
                    const lineNo = idx + 1; // Standard 1, 2, 3 sequence

                    return (
                      <tr key={idx} className="hover:bg-slate-50 font-mono text-[11px]">
                        <td className="py-3 px-4 font-bold text-slate-800">
                          {requisitionNo}
                        </td>
                        <td className="py-3 px-4 text-center text-slate-500 font-semibold">
                          {lineNo}
                        </td>
                        <td className="py-3 px-4 text-slate-700 font-bold">
                          {pr.itemCode}
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-sans">
                          {pr.colorCode}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-blue-600">
                          {Math.round(pr.qty).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center text-slate-400 font-sans font-bold">
                          YD
                        </td>
                        <td className="py-3 px-4 text-center text-slate-500">
                          {formatDate(shipmentDate)}
                        </td>
                        <td className="py-3 px-4 text-center text-slate-500">
                          {formatDate(pr.dueDateRaw || pr.prDueDate)}
                        </td>
                        <td className={`py-3 px-4 text-center font-bold ${
                          (pr.daysEarly || 0) < 0 ? "text-red-600 font-bold" : (pr.daysEarly || 0) > 0 ? "text-slate-500" : "text-emerald-700 font-black"
                        }`}>
                          {pr.daysEarly} days
                        </td>
                        <td className="py-3 px-4 text-center text-emerald-700 font-bold">
                          {formatDate(loadingDate)}
                        </td>
                        <td className="py-3 px-4 text-center text-blue-700 font-bold">
                          {formatDate(pr.poDueDate)}
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
