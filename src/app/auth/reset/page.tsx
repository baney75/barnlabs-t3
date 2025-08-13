import { Suspense } from "react";
import ResetClient from "./_components/ResetClient";

export default function ResetPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetClient />
    </Suspense>
  );
}


