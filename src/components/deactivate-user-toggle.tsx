"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch"; // Assuming you have a Switch component
import { Loader2 } from "lucide-react";
import { setUserActivationStatusAction } from "@/actions/user-management.action"; // Adjust path if needed

interface DeactivateUserToggleProps {
  userId: string;
  isBanned: boolean;
}

export const DeactivateUserToggle = ({ userId, isBanned }: DeactivateUserToggleProps) => {
  const [isPending, setIsPending] = useState(false);
  const [isActive, setIsActive] = useState(!isBanned);
  const router = useRouter();

  const handleChange = async () => {
    setIsPending(true);
    const newBannedStatus = isActive; // Toggling from active to inactive means banned = true

    const result = await setUserActivationStatusAction(userId, newBannedStatus);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(newBannedStatus ? "User deactivated and sessions terminated." : "User activated.");
      setIsActive(!newBannedStatus);
      router.refresh();
    }
    setIsPending(false);
  };

  if (isPending) {
    return <Loader2 className="h-4 w-4 animate-spin" />;
  }

  return (
    <div className="flex items-center gap-2">
      <Switch
        id={`activate-${userId}`}
        checked={isActive}
        onCheckedChange={handleChange}
      />
      <label htmlFor={`activate-${userId}`} className="text-sm">
        {isActive ? "Active" : "Deactivated"}
      </label>
    </div>
  );
};