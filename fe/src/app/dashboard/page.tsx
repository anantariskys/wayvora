"use client";

import { Plus, Route } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { TripCard } from "@/features/trips/components/trip-card";
import { useTrips } from "@/features/trips/hooks/use-trips";

export default function DashboardPage() {
  const tripsQuery = useTrips();

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm text-slate-600 shadow-sm">
              <Route size={15} aria-hidden="true" />
              Smart Travel Route Optimization Platform
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
              Your trip planning workspace
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
              Build destination lists, calculate route-efficient visit orders,
              and turn travel ideas into map-based itineraries.
            </p>
          </div>
          <Link
            href="/trips/new"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800"
          >
            <Plus size={17} aria-hidden="true" />
            New trip
          </Link>
        </div>

        <section className="mt-8 grid gap-4">
          {tripsQuery.isLoading ? (
            <div className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
              Loading trips...
            </div>
          ) : null}

          {tripsQuery.data?.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}

          {!tripsQuery.isLoading && tripsQuery.data?.length === 0 ? (
            <div className="rounded-md border border-dashed border-slate-300 bg-white p-8 text-center">
              <h2 className="text-base font-semibold text-slate-950">
                No trips yet
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Create your first optimized itinerary.
              </p>
              <Button className="mt-4">Create trip</Button>
            </div>
          ) : null}
        </section>
      </main>
    </AppShell>
  );
}
