"use client"

import { Button } from "@/components/ui/button"
import { signIn } from "@/lib/auth-client";
import { useState } from "react";
import { toast } from "sonner";

interface SignInOauthButtonProps {
    provider: "google";
    signUp?: boolean;
}


export const SignInOauthButton = ({provider, signUp}: SignInOauthButtonProps) => {
    const [isPending, setIsPending] = useState(false);

    async function handleClick() {
        await signIn.social({
            provider,
            callbackURL: "/profile",
            errorCallbackURL: "/auth/login/error",
            fetchOptions: {
                onRequest: () => {
                    setIsPending(true);
                },
                onResponse: () => {
                    setIsPending(false);
                },
                onError: (ctx) => {
                    toast.error(ctx.error.message);
                }
            }
        })
    }

    const action = signUp ? "Sign Up" : "Sign In";

    return (
            <Button onClick={handleClick} disabled={isPending}>{action} with Google</Button>
    )
}