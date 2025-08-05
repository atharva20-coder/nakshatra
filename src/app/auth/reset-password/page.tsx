import { ResetPasswordForm } from "@/components/reset-password-form";
import { ReturnButton } from "@/components/return-button";
import { redirect } from "next/navigation";
import { Lock } from "lucide-react";

interface PageProps {
  searchParams: Promise<{ token: string }>;
}

export default async function Page({ searchParams }: PageProps) {
  const token = (await searchParams).token;

  if (!token) redirect("/auth/login");

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16 bg-white">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="flex justify-center">
          <Lock className="h-10 w-10 text-primary" />
        </div>

        <h1 className="text-2xl font-semibold">Reset Your Password</h1>

        <p className="text-muted-foreground text-sm">
          Enter a new password for your account. Password must be at least 6 characters long.
        </p>

        <ResetPasswordForm token={token} />

        <div className="pt-2">
          <ReturnButton href="/auth/login" label="Back to Login" />
        </div>
      </div>
    </div>
  );
}
