import "server-only";
import { buildReport, REPORTS, type ReportKey } from "./reports";
import { loadTrips } from "./trips";
import { parseFilters, query, type SearchParams } from "./params";

/** Reads report params from the URL, loads the trips and builds the report. Shared by the page and the export. */
export async function reportFromParams(sp: SearchParams) {
  const f = parseFilters(sp);
  const key = (REPORTS.some((r) => r.key === f.get("r")) ? f.get("r") : "vehicle") as ReportKey;
  const def = REPORTS.find((r) => r.key === key)!;
  const vehicleId = def.filters.includes("vehicle") ? f.vehicle : undefined;
  const driverId = def.filters.includes("driver") ? f.driver : undefined;
  const typeId = def.filters.includes("type") ? f.type : undefined;
  const group = def.groupable && f.get("g") === "month" ? "month" : "day";
  const trips = await loadTrips({ from: f.from, to: f.to, vehicleId, driverId, includePaidInRange: key === "balance" });
  const report = buildReport(trips, { key, from: f.from, to: f.to, group, typeId, drillQuery: query({ from: f.from, to: f.to, ...(key !== "vehicle" && { vehicle: vehicleId }), ...(key !== "driver" && { driver: driverId }) }) });
  return { report, def, f, vehicleId, driverId, typeId, group, view: f.get("view") === "chart" ? "chart" : "table" };
}
