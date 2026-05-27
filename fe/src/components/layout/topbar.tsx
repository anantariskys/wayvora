import { MapIcon, Route, Settings } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Topbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2"
          aria-label="Wayvora home"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-950 text-white">
            <Route size={18} aria-hidden="true" />
          </span>
          <span>
            <span className="block text-sm font-semibold leading-4">
              Wayvora
            </span>
            <span className="block text-xs text-slate-500">
              Route intelligence
            </span>
          </span>
        </Link>
        <nav
          className="hidden items-center gap-1 md:flex"
          aria-label="Primary navigation"
        >
          <Link
            className="rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-950"
            href="/dashboard"
          >
            Dashboard
          </Link>
          <Link
            className="rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-950"
            href="/trips/new"
          >
            Planner
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" aria-label="Map settings">
            <MapIcon size={17} aria-hidden="true" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Application settings">
            <Settings size={17} aria-hidden="true" />
          </Button>
        </div>
      </div>
    </header>
  );
}
