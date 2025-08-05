import { LoginForm } from "@/components/login-form";
import { MagicLinkLoginForm } from "@/components/magic-link-login-form";
import { ReturnButton } from "@/components/return-button";
import { SignInOauthButton } from "@/components/sign-in-oauth-buttons";
import Link from "next/link";

export default function Page() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-white to-rose-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4">
      <div className="w-full max-w-md p-8 rounded-2xl shadow-lg backdrop-blur bg-white/80 dark:bg-black/30 border border-gray-200 dark:border-gray-700">
        <div className="mb-6">
          <ReturnButton href="/" label=" Back to Home" />
        </div>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Welcome Back 👋</h1>
        <p className="text-gray-500 dark:text-gray-300 text-sm mb-6">Login to continue using your account</p>
        <div className="space-y-6">
          <MagicLinkLoginForm />
          <LoginForm />
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-300 mt-4">
          Don&apos;t have an account?{" "}
          <Link
            href="/auth/register"
            className="font-semibold text-rose-600 hover:underline dark:text-rose-400"
          >
            Register
          </Link>
        </p>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-300 dark:border-gray-600" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white dark:bg-black px-2 text-gray-500 dark:text-gray-400">Or continue with</span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <SignInOauthButton provider="google" />
        </div>
      </div>
    </div>
  );
}
