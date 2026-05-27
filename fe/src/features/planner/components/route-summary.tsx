import { Activity, Clock, Gauge, Route } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { formatDistance, formatDuration } from "@/lib/utils";
import type { OptimizedRoute, TravelProfile } from "../types";

type RouteSummaryProps = {
  route: OptimizedRoute | null;
  profile: TravelProfile;
  isStale?: boolean;
};

export function RouteSummary({ route, profile, isStale }: RouteSummaryProps) {
  if (!route) {
    return (
      <section className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Route size={16} aria-hidden="true" />
          Route not optimized
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Add multiple destinations, then calculate the best visit order for the
          selected travel profile.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-950">
            Route summary
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Optimized with {route.algorithm.replace("_", " ")}
          </p>
        </div>
        <Badge
          className={
            isStale ? "border-amber-200 bg-amber-50 text-amber-700" : ""
          }
        >
          {isStale ? "Needs refresh" : profile}
        </Badge>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Metric
          icon={<Gauge size={16} aria-hidden="true" />}
          label="Distance"
          value={formatDistance(route.summary.totalDistanceMeters)}
        />
        <Metric
          icon={<Clock size={16} aria-hidden="true" />}
          label="Duration"
          value={formatDuration(route.summary.totalDurationSeconds)}
        />
        <Metric
          icon={<Activity size={16} aria-hidden="true" />}
          label="Matrix"
          value={route.summary.matrixCacheHit ? "Cache hit" : "Fresh"}
        />
        <Metric
          icon={<Route size={16} aria-hidden="true" />}
          label="Runtime"
          value={`${route.summary.optimizationRuntimeMs} ms`}
        />
      </div>
    </section>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-slate-100 bg-slate-50 p-3">
      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-slate-950">{value}</div>
    </div>
  );
}
