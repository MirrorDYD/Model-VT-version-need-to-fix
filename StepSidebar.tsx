import { ProcessedScenario } from "../types";
import { CheckCircle2, AlertTriangle, Ship, ArrowRight, TableProperties, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Language, t } from "../utils/translate";

interface ScenarioOverviewProps {
  scenarios: ProcessedScenario[];
  selectedScenarioId: string;
  onSelectScenario: (id: string) => void;
  lang: Language;
}

export default function ScenarioOverview({
  scenarios,
  selectedScenarioId,
  onSelectScenario,
  lang
}: ScenarioOverviewProps) {
  if (scenarios.length === 0) return null;

  // Find the cheapest scenario
  const cheapest = [...scenarios].sort((a, b) => a.totalLandedCost - b.totalLandedCost)[0];

  // Find baseline (Scenario 1) for difference calculations
  const scenario1 = scenarios.find(sc => sc.id === "1") || scenarios[0];
  const scenario1Cost = scenario1 ? scenario1.totalLandedCost : 0;

  // Prepare chart data for Recharts
  const chartData = scenarios.map(sc => ({
    id: sc.id,
    name: `Scen ${sc.id}`,
    "Material Cost": sc.totalMaterialCost,
    "Shipping Cost": sc.totalFreightCost + sc.totalLocalCost + sc.totalBrokerageCost,
    "Carrying Cost": sc.totalCarryingCost,
    "Opportunity Cost": sc.totalOpportunityCost,
    "MOQ Surcharge": sc.totalMoqExcessCost,
    "Rounding Excess": sc.totalRoundingExcessCost,
    total: sc.totalLandedCost
  }));

  // Custom tool tip for the charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum: number, entry: any) => sum + entry.value, 0);
      return (
        <div className="bg-white border border-slate-200 p-3.5 rounded-lg shadow-xl text-xs font-sans">
          <p className="font-bold text-slate-800 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex justify-between gap-6 py-0.5 text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
                {entry.name}:
              </span>
              <span className="font-mono font-medium text-slate-800">{entry.value.toLocaleString()} THB</span>
            </div>
          ))}
          <div className="border-t border-slate-100 mt-2 pt-1.5 flex justify-between gap-6 font-bold text-blue-600">
            <span>{t("True Landed Cost", lang)}:</span>
            <span className="font-mono">{total.toLocaleString()} THB</span>
          </div>
        </div>
      );
    }
    return null;
  };

  // For the second chart data (no material cost)
  const chartDataNoMaterial = scenarios.map(sc => ({
    id: sc.id,
    name: `Scen ${sc.id}`,
    "Shipping Cost": sc.totalFreightCost + sc.totalLocalCost + sc.totalBrokerageCost,
    "Carrying Cost": sc.totalCarryingCost,
    "Opportunity Cost": sc.totalOpportunityCost,
    "MOQ Surcharge": sc.totalMoqExcessCost,
    "Rounding Excess": sc.totalRoundingExcessCost,
  }));

  const CustomTooltipNoMaterial = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum: number, entry: any) => sum + entry.value, 0);
      return (
        <div className="bg-white border border-slate-200 p-3.5 rounded-lg shadow-xl text-xs font-sans">
          <p className="font-bold text-slate-800 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex justify-between gap-6 py-0.5 text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
                {entry.name}:
              </span>
              <span className="font-mono font-medium text-slate-800">{entry.value.toLocaleString()} THB</span>
            </div>
          ))}
          <div className="border-t border-slate-100 mt-2 pt-1.5 flex justify-between gap-6 font-bold text-emerald-600">
            <span>{t("Shipping", lang)} + {t("Carrying", lang)} + {t("Opportunity", lang)} + {t("Surcharges (MOQ/MCQ+Rnd)", lang)}:</span>
            <span className="font-mono">{total.toLocaleString()} THB</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8">
      {/* Visual Scenario Cards Grid */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
          <Ship size={16} className="text-blue-600" />
          {t("Container & Logistics Scenario Slices", lang)}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {scenarios.map(sc => {
            const isCheapest = sc.id === cheapest.id;
            const isSelected = sc.id === selectedScenarioId;
            const isScenario1 = sc.id === "1";

            const hasOverloaded = sc.errorFlags?.some(f => f.category === "Container" && f.type === "error");
            const hasOverdue = sc.errorFlags?.some(f => f.category === "Delay" && f.type === "error");
            const isFlagged = sc.containerMatchingStatus === "Mismatch" || sc.errorFlags?.some(f => f.type === "warning");
            const isApproved = sc.containerMatchingStatus === "Approved" && !hasOverloaded && !hasOverdue && !isFlagged;

            return (
              <div
                key={sc.id}
                onClick={() => onSelectScenario(sc.id)}
                className={`relative bg-white border rounded-xl p-5 shadow-sm transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? "ring-2 ring-blue-600 border-transparent shadow-md transform -translate-y-0.5"
                    : "border-slate-200 hover:border-slate-300 hover:shadow-md"
                }`}
              >
                {/* Badges */}
                <div className="absolute top-4 right-4 flex flex-wrap items-center justify-end gap-1.5 max-w-[65%]">
                  {isCheapest && (
                    <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px] uppercase tracking-wider">
                      {t("Best Price", lang)}
                    </span>
                  )}
                  {isScenario1 ? (
                    <span className="bg-slate-100 text-slate-800 font-bold px-2 py-0.5 rounded text-[10px] uppercase tracking-wider">
                      Baseline
                    </span>
                  ) : hasOverloaded ? (
                    <span className="bg-rose-100 text-rose-800 border border-rose-200 font-bold px-2 py-0.5 rounded text-[10px] uppercase tracking-wider">
                      {t("Overloaded", lang)}
                    </span>
                  ) : hasOverdue ? (
                    <span className="bg-red-100 text-red-800 border border-red-200 font-bold px-2 py-0.5 rounded text-[10px] uppercase tracking-wider">
                      {t("Overdue", lang)}
                    </span>
                  ) : isFlagged ? (
                    <span className="bg-amber-100 text-amber-800 border border-amber-200 font-bold px-2 py-0.5 rounded text-[10px] uppercase tracking-wider">
                      {t("Flagged", lang)}
                    </span>
                  ) : isApproved ? (
                    <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold px-2 py-0.5 rounded text-[10px] uppercase tracking-wider">
                      {t("Approved", lang)}
                    </span>
                  ) : null}
                </div>

                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  {t("Scenario", lang)} {sc.id}
                </div>
                
                {/* Shipments involved tag list */}
                <div className="mt-1 flex flex-wrap gap-1">
                  {sc.weeks.map(w => (
                    <span
                      key={w}
                      className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium"
                    >
                      W{w}
                    </span>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>{t("Landed Cost", lang)}:</span>
                    <span className="font-mono font-bold text-slate-800">
                      {Math.round(sc.totalLandedCost).toLocaleString()} THB
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>{t("Total Vol", lang)}:</span>
                    <span className="font-mono text-slate-600">
                      {sc.totalCbm.toFixed(2)} CBM
                    </span>
                  </div>
                </div>

                {/* Containers used display */}
                <div className="mt-3 bg-slate-50 p-2.5 rounded border border-slate-100">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    {t("Containers Required", lang)}
                  </div>
                  <div className="text-[11px] font-mono font-medium text-slate-600 line-clamp-2 leading-relaxed">
                    {sc.shipments.map((s, idx) => (
                      <div key={idx} className="flex justify-between py-0.5 border-b border-slate-100 last:border-b-0">
                        <span>Ship {idx + 1}:</span>
                        <span className="text-blue-600 text-right font-semibold">{s.container.name.split(" FCL")[0].split(" LCL")[0]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* cost breakdown charts stacked vertically */}
      <div className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="text-blue-600" size={18} />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-800">
              {t("Scenario Cost Breakdown Analysis (THB)", lang)}
            </h3>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconSize={10} iconType="circle" wrapperStyle={{ fontSize: 11, color: "#64748b" }} />
                <Bar dataKey="Material Cost" name={t("Material", lang)} stackId="a" fill="#1e40af" />
                <Bar dataKey="Shipping Cost" name={t("Shipping", lang)} stackId="a" fill="#2563eb" />
                <Bar dataKey="Carrying Cost" name={t("Carrying", lang)} stackId="a" fill="#8b5cf6" />
                <Bar dataKey="Opportunity Cost" name={t("Opportunity", lang)} stackId="a" fill="#06b6d4" />
                <Bar dataKey="MOQ Surcharge" name={t("Surcharges (MOQ/MCQ+Rnd)", lang)} stackId="a" fill="#f43f5e" />
                <Bar dataKey="Rounding Excess" name="Rounding Surcharge" stackId="a" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="text-emerald-600" size={18} />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-800">
              {t("Scenario Cost Breakdown Analysis (Excluding Material Cost) (THB)", lang)}
            </h3>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartDataNoMaterial}
                margin={{ top: 10, right: 10, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltipNoMaterial />} />
                <Legend iconSize={10} iconType="circle" wrapperStyle={{ fontSize: 11, color: "#64748b" }} />
                <Bar dataKey="Shipping Cost" name={t("Shipping", lang)} stackId="a" fill="#2563eb" />
                <Bar dataKey="Carrying Cost" name={t("Carrying", lang)} stackId="a" fill="#8b5cf6" />
                <Bar dataKey="Opportunity Cost" name={t("Opportunity", lang)} stackId="a" fill="#06b6d4" />
                <Bar dataKey="MOQ Surcharge" name={t("Surcharges (MOQ/MCQ+Rnd)", lang)} stackId="a" fill="#f43f5e" />
                <Bar dataKey="Rounding Excess" name="Rounding Surcharge" stackId="a" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Multi-Scenario Ledger Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 bg-slate-50 border-b border-slate-100">
          <TableProperties className="text-blue-600" size={18} />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-800">
            {t("VT Garment Multi-Scenario Sourcing Ledger", lang)}
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-slate-500 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-200">
                <th className="py-3.5 px-4 text-center">{t("Scenario", lang)}</th>
                <th className="py-3.5 px-4 text-center">{t("Active Shipments", lang)}</th>
                <th className="py-3.5 px-4 text-center">{t("Total Qty", lang)}</th>
                <th className="py-3.5 px-4 text-center">{t("Volume (CBM)", lang)}</th>
                <th className="py-3.5 px-4 text-right">{t("Material", lang)}</th>
                <th className="py-3.5 px-4 text-right">{t("Freight", lang)}</th>
                <th className="py-3.5 px-4 text-right">{t("Local", lang)}</th>
                <th className="py-3.5 px-4 text-right">{t("Brokerage", lang)}</th>
                <th className="py-3.5 px-4 text-right text-slate-800 font-bold bg-slate-100/50">{t("Shipping", lang)}</th>
                <th className="py-3.5 px-4 text-right">{t("Carrying", lang)}</th>
                <th className="py-3.5 px-4 text-right">{t("Opportunity", lang)}</th>
                <th className="py-3.5 px-4 text-right">{t("Surcharges (MOQ/MCQ+Rnd)", lang)}</th>
                <th className="py-3.5 px-4 text-right text-blue-600 font-bold">{t("True Landed Cost", lang)}</th>
                <th className="py-3.5 px-4 text-right text-emerald-600 font-bold bg-emerald-50/30">{t("Diff vs Scen 1", lang)}</th>
                <th className="py-3.5 px-4">{t("Containers Used", lang)}</th>
                <th className="py-3.5 px-4 text-center">{t("Status", lang)}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {scenarios.map(sc => {
                const isSelected = sc.id === selectedScenarioId;
                const isScenario1 = sc.id === "1";
                const diff = sc.totalLandedCost - scenario1Cost;

                const hasOverloaded = sc.errorFlags?.some(f => f.category === "Container" && f.type === "error");
                const hasOverdue = sc.errorFlags?.some(f => f.category === "Delay" && f.type === "error");
                const isFlagged = sc.containerMatchingStatus === "Mismatch" || sc.errorFlags?.some(f => f.type === "warning");
                const isApproved = sc.containerMatchingStatus === "Approved" && !hasOverloaded && !hasOverdue && !isFlagged;

                return (
                  <tr
                    key={sc.id}
                    onClick={() => onSelectScenario(sc.id)}
                    className={`cursor-pointer transition duration-150 hover:bg-slate-50 ${
                      isSelected ? "bg-blue-50/50 font-medium border-l-2 border-l-blue-600" : ""
                    }`}
                  >
                    <td className="py-3 px-4 text-center font-mono font-bold text-slate-800">
                      Scenario {sc.id}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-slate-600">
                      {sc.weeks.join(", ")}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-slate-600">
                      {Math.round(sc.totalQty).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-slate-600">
                      {sc.totalCbm.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-500">
                      {Math.round(sc.totalMaterialCost).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-500">
                      {Math.round(sc.totalFreightCost).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-500">
                      {Math.round(sc.totalLocalCost).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-500">
                      {Math.round(sc.totalBrokerageCost).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-800 font-bold bg-slate-50/40">
                      {Math.round(sc.totalFreightCost + sc.totalLocalCost + sc.totalBrokerageCost).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-500">
                      {Math.round(sc.totalCarryingCost).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-500">
                      {Math.round(sc.totalOpportunityCost).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-500">
                      {(Math.round(sc.totalMoqExcessCost + sc.totalRoundingExcessCost)).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-blue-600">
                      {Math.round(sc.totalLandedCost).toLocaleString()}
                    </td>
                    <td className={`py-3 px-4 text-right font-mono font-bold ${
                      diff < -1 ? "text-emerald-600 bg-emerald-50/20" : diff > 1 ? "text-rose-600" : "text-slate-400"
                    }`}>
                      {diff === 0 ? "-" : (diff > 0 ? "+" : "") + Math.round(diff).toLocaleString() + " THB"}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500 truncate max-w-xs">
                      {sc.containersUsedList.map(c => c.split(" FCL")[0].split(" LCL")[0]).join(" + ")}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {isScenario1 ? (
                        <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-mono font-semibold">
                          Baseline
                        </span>
                      ) : hasOverloaded ? (
                        <span className="bg-rose-50 text-rose-700 px-2 py-0.5 rounded text-[10px] font-mono font-semibold">
                          {t("Overloaded", lang)}
                        </span>
                      ) : hasOverdue ? (
                        <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded text-[10px] font-mono font-semibold">
                          {t("Overdue", lang)}
                        </span>
                      ) : isFlagged ? (
                        <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-[10px] font-mono font-semibold" title={sc.containerMatchingDetails}>
                          {t("Flagged", lang)}
                        </span>
                      ) : isApproved ? (
                        <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-mono font-semibold">
                          {t("Approved", lang)}
                        </span>
                      ) : null}
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
}
