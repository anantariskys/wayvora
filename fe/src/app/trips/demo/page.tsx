import { AppShell } from "@/components/layout/app-shell";
import { TripPlanner } from "@/features/planner/components/trip-planner";

export default function DemoTripPage() {
  return (
    <AppShell>
      <TripPlanner tripId="demo" />
    </AppShell>
  );
}
