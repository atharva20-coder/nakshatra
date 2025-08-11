// src/app/admin/forms/page.tsx
import { requireAdmin } from "@/lib/auth-utils";
import { AdminFormsClient } from "./admin-forms-client";

export default async function AdminFormsPage() {
  await requireAdmin();
  return <AdminFormsClient />;
}