"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendVerificationEmail } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { MailCheck } from "lucide-react";

export const SendVerificationEmailForm = () => {
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  async function handleSubmit(evt: React.FormEvent<HTMLFormElement>) {
    evt.preventDefault();
    const formData = new FormData(evt.currentTarget);
    const email = String(formData.get("email"));

    if (!email) return toast.error("Please enter your email.");

  await sendVerificationEmail({
      email,
      callbackURL: "/auth/verify",
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
          toast.success("Verification email sent successfully.");
          router.push("/auth/verify/success");
        },
      },
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 w-full max-w-md mx-auto text-left"
    >
      <div className="space-y-1">
        <Label htmlFor="email" className="text-base font-medium">
          Registered Email Address
        </Label>
        <Input
          type="email"
          id="email"
          name="email"
          placeholder="you@example.com"
          className="text-sm"
          required
        />
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="w-full bg-rose-600 hover:bg-rose-700"
      >
        {isPending ? "Sending..." : (
          <>
            <MailCheck className="w-4 h-4 mr-2" /> Resend Verification Email
          </>
        )}
      </Button>
    </form>
  );
};
