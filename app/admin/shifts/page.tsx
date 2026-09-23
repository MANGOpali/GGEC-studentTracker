import { Suspense } from "react";
import ShiftsClient from "./ShiftsClient";

export default function AdminShiftsPage() {
  return (
    <div>
      <Suspense>
        <ShiftsClient />
      </Suspense>
    </div>
  );
}
