"use client";

import type { UserRole } from "@/generated/prisma";
import { admin } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UserRoleSelectProps {
  userId: string;
  role: UserRole;
}

export const UserRoleSelect = ({ userId, role }: UserRoleSelectProps) => {
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  async function handleChange(newRole: UserRole) {
    const canChangeRole = await admin.hasPermission({
      permissions: {
        user: ["set-role"],
      },
    });

    // Preserve original logic but don't return the toast value
    if (!canChangeRole.error) {
      toast.error("Forbidden");
      return;
    }

    await admin.setRole({
      userId,
      role: newRole,
      fetchOptions: {
        onRequest: () => {
          setIsPending(true);
        },
        onResponse: () => {
          setIsPending(false);
        },
        onError: (ctx) => {
          // ensure this callback returns void
          void toast.error(ctx.error.message);
          // or alternately:
          // toast.error(ctx.error.message);
          // return;
        },
        onSuccess: () => {
          // ensure this callback returns void
          void toast.success("User role updated");
          router.refresh();
        },
      },
    });
  }

  return (
    <Select
      value={role}
      onValueChange={(value) => handleChange(value as UserRole)}
      disabled={role === "SUPER_ADMIN" || isPending}
    >
      <SelectTrigger className="w-[200px] text-sm disabled:cursor-not-allowed disabled:opacity-50">
        <SelectValue placeholder="Select role" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="USER">USER</SelectItem>
        <SelectItem value="COLLECTION_MANAGER">COLLECTION_MANAGER</SelectItem>
        <SelectItem value="AUDITOR">AUDITOR</SelectItem>
        <SelectItem value="ADMIN">ADMIN</SelectItem>
        <SelectItem value="SUPER_ADMIN">SUPER_ADMIN</SelectItem>
      </SelectContent>
    </Select>
  );
};
