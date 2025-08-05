"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export async function deleteUserAction({userId}: {userId: string}) {
    const headersList = await headers()

    const session = await auth.api.getSession({
        headers: headersList
    });

    if(!session) {
        throw new Error("Unauthorized");
    }

    if(session.user.role !== "ADMIN" || session.user.id === userId) {
        throw new Error("FOREBIDDEN");
    }

    try{
        await prisma.user.delete({
            where: {
                id: userId,
                role: "USER"
            },
        });

        if(session.user.id === userId){
            await auth.api.signOut({
                headers: headersList,
            })
            redirect("/auth/login")
        }
        revalidatePath("/admin/dashboard");
        return {error: null}
    }catch(err){
        if(isRedirectError(err)){
            throw err;
        }
        if(err instanceof Error){
            return { error: err.message}
        }
        return {error: "Internal Server Error"}
    }
}