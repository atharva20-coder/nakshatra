import { ReturnButton } from "@/components/return-button";
import { SendVerificationEmailForm } from "@/components/send-verification-email-form";
import { redirect } from "next/navigation";
import Image from "next/image";

interface PageProps {
  searchParams: Promise<{ error: string }>;
}

export default async function Page({ searchParams }: PageProps) {
  const error = (await searchParams).error;

  if (!error) redirect("/profile");

  const readableError = error
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-rose-50 via-white to-rose-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="w-full max-w-lg p-8 rounded-2xl shadow-2xl backdrop-blur bg-white/90 dark:bg-black/30 border border-gray-200 dark:border-gray-700 space-y-6">
        
        {/* Axis Bank Logo */}
        <div className="flex justify-center">
          <Image src="/logo.jpg" alt="Axis Bank" width={120} height={50} className="rounded-md object-contain" />
        </div>

        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Email Verification Failed
          </h1>
          <p className="text-destructive text-sm dark:text-gray-300">
            {readableError} — Please request a new verification email.
          </p>
        </div>

        <SendVerificationEmailForm />

        <div className="flex flex-col items-center gap-2 pt-4">
          <ReturnButton href="/auth/login" label="Back to Login" />
        </div>
      </div>
    </div>
  );
}
