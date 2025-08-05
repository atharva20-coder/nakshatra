import { ReturnButton } from "@/components/return-button";
import { CheckCircle } from "lucide-react";

export default function Page() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-rose-50 via-white to-rose-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="w-full max-w-md p-8 rounded-2xl shadow-lg backdrop-blur bg-white/80 dark:bg-black/30 border border-gray-200 dark:border-gray-700 text-center space-y-6">
        <div className="flex justify-start">
          <ReturnButton href="/auth/login" label="Back to Login" />
        </div>

        <div className="flex flex-col items-center gap-4">
          <CheckCircle className="text-green-600 dark:text-green-400 w-12 h-12" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Registration Successful
          </h1>
          <p className="text-gray-700 dark:text-gray-300">
            Congratulations! Your account has been created successfully.
            Please check your email to verify your address before logging in.
          </p>
        </div>
      </div>
    </div>
  );
}
