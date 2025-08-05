import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { ReturnButton } from "@/components/return-button";
import { MailCheck } from "lucide-react";

export default function Page() {
  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-12 bg-white dark:bg-black text-gray-900 dark:text-gray-100">
      
      {/* Top Nav */}
      <div className="absolute top-6 left-6">
        <ReturnButton href="/auth/login" label="Back to Login" />
      </div>

      {/* Centered Form Area */}
      <div className="max-w-xl mx-auto space-y-8 text-center">
        
        {/* Icon and Heading */}
        <div className="space-y-4">
          <MailCheck className="mx-auto h-12 w-12 text-rose-700 dark:text-rose-400" />
          <h1 className="text-4xl font-bold">Forgot your password?</h1>
          <p className="text-muted-foreground text-lg">
            Enter your email below, and we’ll send you a reset link.
          </p>
        </div>

        {/* Form */}
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
