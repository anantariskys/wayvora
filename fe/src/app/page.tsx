import {
  ArrowRight,
  MapPinned,
  Route,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";

export default function Home() {
  return (
    <AppShell>
      <main className="mx-auto grid min-h-[calc(100dvh-56px)] w-full max-w-7xl items-center gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm text-slate-600 shadow-sm">
            <Sparkles size={15} aria-hidden="true" />
            Smart Travel Route Optimization Platform
          </div>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
            Wayvora
          </h1>
          <p className="mt-4 text-lg leading-8 text-slate-600">
            Generate optimized travel itineraries with destination search,
            multi-stop routing, and an interactive map planner built for serious
            travel workflows.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/trips/demo"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-slate-950 px-5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800"
            >
              Open planner
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex h-11 items-center justify-center rounded-md border border-slate-200 bg-white px-5 text-sm font-medium text-slate-900 shadow-sm transition-colors hover:bg-slate-50"
            >
              View dashboard
            </Link>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <Feature
              icon={<Route size={18} aria-hidden="true" />}
              label="TSP-inspired optimization"
            />
            <Feature
              icon={<MapPinned size={18} aria-hidden="true" />}
              label="MapLibre map workspace"
            />
            <Feature
              icon={<ShieldCheck size={18} aria-hidden="true" />}
              label="API-first architecture"
            />
          </div>
        </section>

        <section className="min-h-[520px] overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
          <div className="flex h-full min-h-[520px] flex-col">
            <div className="border-b border-slate-200 p-4">
              <div className="h-3 w-40 rounded bg-slate-200" />
              <div className="mt-3 h-9 rounded-md border border-slate-200 bg-slate-50" />
            </div>
            <div className="relative flex-1 bg-[#dce8e4]">
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(15,23,42,0.08)_1px,transparent_1px),linear-gradient(rgba(15,23,42,0.08)_1px,transparent_1px)] bg-[size:46px_46px]" />
              <svg
                className="absolute inset-0 h-full w-full"
                role="img"
                aria-label="Route preview"
              >
                <title>Route preview</title>
                <polyline
                  points="90,330 180,170 292,142 386,282 494,330"
                  fill="none"
                  stroke="#0f172a"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="5"
                />
              </svg>
              {[
                ["18%", "70%"],
                ["36%", "36%"],
                ["58%", "30%"],
                ["76%", "60%"],
              ].map(([left, top], index) => (
                <span
                  key={`${left}-${top}`}
                  className="absolute flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-md border-2 border-white bg-slate-950 text-sm font-semibold text-white shadow-lg"
                  style={{ left, top }}
                >
                  {index + 1}
                </span>
              ))}
            </div>
          </div>
        </section>
      </main>
    </AppShell>
  );
}

function Feature({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
      <div className="text-slate-950">{icon}</div>
      <p className="mt-2 text-sm font-medium leading-5 text-slate-700">
        {label}
      </p>
    </div>
  );
}
