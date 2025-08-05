import { ReturnButton } from "@/components/return-button";
import Link from "next/link";
import { AlertTriangle } from "lucide-react"; // optional icon

interface PageProps {
    searchParams: Promise<{error: string}>
}

export default async function Page(
    {searchParams}: PageProps
) {
    const sp = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-rose-50 via-white to-rose-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="w-full max-w-md p-8 rounded-2xl shadow-lg backdrop-blur bg-white/80 dark:bg-black/30 border border-gray-200 dark:border-gray-700 text-center space-y-6">
        <div className="flex justify-start">
          <ReturnButton href="/" label="Back to Home" />
        </div>

        <div className="flex flex-col items-center gap-3">
          <AlertTriangle className="text-rose-600 dark:text-rose-400 w-10 h-10" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Login Failed</h1>
          <p className="text-destructive text-sm  dark:text-gray-300">
            {sp.error === "account_not_linked" ? "Account not linked with Google" : "Invalid credentials"}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Link
            href="/auth/login"
            className="inline-block px-4 py-2 bg-rose-600 text-white rounded-md font-medium hover:bg-rose-700 transition"
          >
            Retry Login
          </Link>
          <Link
            href="/"
            className="text-sm text-gray-700 dark:text-gray-300 underline hover:text-rose-600 dark:hover:text-rose-400"
          >
            Go back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
