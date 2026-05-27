import { AppShell } from "@/components/layout/app-shell";
import { TripPlanner } from "@/features/planner/components/trip-planner";

export default function NewTripPage() {
  return (
    <AppShell>
      <TripPlanner tripId="new" />
    </AppShell>
  );
}
