"use client";

import { Suspense } from "react";
import ApprovalRequestForm from "./ApprovalRequestForm";

export default function ApprovalRequestPageWrapper() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading form...</div>}>
      <ApprovalRequestForm />
    </Suspense>
  );
}
