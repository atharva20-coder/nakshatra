import { ReturnButton } from "@/components/return-button";
import { CheckCircle } from "lucide-react";

export default function Page() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16 bg-white">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="flex justify-center">
          <CheckCircle className="text-green-500 h-12 w-12" />
        </div>

        <h1 className="text-2xl font-semibold">Reset Link Sent</h1>

        <p className="text-muted-foreground text-sm">
          We&apos;ve sent a password reset link to your email. Check your inbox and follow the instructions to reset your password.
        </p>

        <ReturnButton href="/auth/login" label="Back to Login" />
      </div>
    </div>
  );
}
