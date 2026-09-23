import { Suspense } from "react";
import StudentsClient from "./StudentsClient";

export default function ReceptionStudentsPage() {
  return (
    <div>
      <Suspense>
        <StudentsClient />
      </Suspense>
    </div>
  );
}
