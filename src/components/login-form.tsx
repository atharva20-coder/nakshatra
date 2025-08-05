"use client";

import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInEmailAction } from "@/actions/sign-in-email.action";
import Link from "next/link";

export const LoginForm = () => {
    const [isPending, setIsPending] = useState(false);
    const router = useRouter();

        async function handleSubmit(evt: React.FormEvent<HTMLFormElement>) {
        evt.preventDefault();
        setIsPending(true);
        const formData = new FormData(evt.target as HTMLFormElement);

        const {error} = await signInEmailAction(formData);
        if(error) {
            toast.error(error)
            setIsPending(false);
        }else{
            toast.success("Login successfull. Good to have you back!")
            router.push("/profile")
        }

        setIsPending(false);
    }

  return <form onSubmit={handleSubmit} className="max-w-sm w-full space-y-4">

    <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" name="email" />
    </div>

    <div className="space-y-2">
        <div className="flex justify-between item-center gap-2">
            <Label htmlFor="password">Password</Label>
            <Link href="/auth/forgot-password" className="text-sm italic text-muted-foreground hover:text-foreground">
                Forgot Password
            </Link>
        </div>
        <Input id="password" type="password" name="password" />
    </div>
    <Button type="submit" className="w-full" disabled={isPending}>Log In</Button>
  </form>
};