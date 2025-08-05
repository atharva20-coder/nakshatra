"use client";

import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signUpEmailAction } from "@/actions/sign-up-email.action";


export const RegisterForm = () => {
    const [isPending, setIsPending] = useState(false);
    const router = useRouter();

    async function handleSubmit(evt: React.FormEvent<HTMLFormElement>) {
        evt.preventDefault();
        setIsPending(true);
        const formData = new FormData(evt.target as HTMLFormElement);

        const {error} = await signUpEmailAction(formData);
        if(error) {
            toast.error(error)
            setIsPending(false);
        }else{
            toast.success("Registration successfull. Please verify your email")
            router.push("/auth/register/success")
        }

        setIsPending(false);
    }

  return <form onSubmit={handleSubmit} className="max-w-sm w-full space-y-4">
    <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" />
    </div>

    <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" name="email" />
    </div>

    <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" name="password" />
    </div>
    <Button type="submit" className="w-full" disabled={isPending}>Register</Button>
  </form>
};