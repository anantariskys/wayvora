import { CalendarDays, MapPin, Route } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

type TripCardProps = {
  trip: {
    id: string;
    name: string;
    description: string;
    placeCount: number;
    lastOptimizedAt?: string;
  };
};

export function TripCard({ trip }: TripCardProps) {
  return (
    <article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-950">
            {trip.name}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            {trip.description}
          </p>
        </div>
        <Badge>Draft</Badge>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <MapPin size={15} aria-hidden="true" />
          {trip.placeCount} places
        </span>
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays size={15} aria-hidden="true" />
          Apr 10-14, 2026
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Route size={15} aria-hidden="true" />
          Last optimized today
        </span>
      </div>

      <div className="mt-5 flex justify-end">
        <Link
          href="/trips/demo"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800"
        >
          Open planner
        </Link>
      </div>
    </article>
  );
}
