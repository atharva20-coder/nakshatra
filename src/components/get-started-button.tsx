"use client"

import { useSession } from "@/lib/auth-client"
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const GetStartedButton = () => {
    const {data: session, isPending} = useSession();

    if(isPending){
        return (
            <Button size="lg" className="opacity-50" asChild>
                Get Started
            </Button>
        )
    }

    const href = session ? "/profile" : "auth/register";

    
    return(
        <div className="flex flex-col items-center gap-4">
            <Button size="lg" className="bg-rose-900 text-white hover:bg-rose-950 font-semibold px-4 py-2 rounded-md transition-colors" asChild>
                <Link href={href}>
                Get Started
                </Link>
            </Button>
            {session && (<p className="flex items-center gap-2">
                <span data-role={session.user.role} className="size-4 rounded-full animate-pulse data-[role=USER]:bg-blue-500 data-[role=ADMIN]:bg-rose-950" />
                Welcome back, {session.user.name}! 
                </p>)}
        </div>
    )
}