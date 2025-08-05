"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { forgetPassword } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export const ForgotPasswordForm = () => {
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  async function handleSubmit(evt: React.FormEvent<HTMLFormElement>) {
    evt.preventDefault();
    const formData = new FormData(evt.currentTarget);
    const email = String(formData.get("email"));

    if (!email.trim()) return toast.error("Please enter your email.");

 await forgetPassword({
      email,
      redirectTo: "/auth/reset-password",
      fetchOptions: {
        onRequest: () => {
          setIsPending(true);
        },
        onResponse: () => {
          setIsPending(false);
        },
        onError: (ctx) => {
          toast.error(ctx.error.message);
        },
        onSuccess: () => {
          toast.success("Reset link sent to your email.");
          router.push("/auth/forgot-password/success");
        },
      },
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full space-y-6 bg-white p-6 sm:p-8 border border-gray-200 rounded-xl shadow-sm transition-all"
    >
      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-medium text-gray-700">
          Email address
        </Label>
        <Input
          type="email"
          id="email"
          name="email"
          placeholder="your@email.com"
          className="h-11 px-4 text-base border-gray-300 focus:border-primary focus:ring-primary"
          disabled={isPending}
        />
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="w-full h-11 text-base font-semibold"
      >
        {isPending ? "Sending..." : "Send Reset Link"}
      </Button>
    </form>
  );
};
