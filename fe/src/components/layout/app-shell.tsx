import type { ReactNode } from "react";
import { Topbar } from "./topbar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-slate-50 text-slate-950">
      <Topbar />
      {children}
    </div>
  );
}
