"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { UserRole } from "@/generated/prisma"; // Import UserRole

export async function deleteUserAction({userId}: {userId: string}) {
    const headersList = await headers()

    const session = await auth.api.getSession({
        headers: headersList
    });

    if(!session) {
        throw new Error("Unauthorized");
    }

    // --- MODIFICATION: Allow SUPER_ADMIN to delete USERs ---
    if(session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
        throw new Error("FORBIDDEN");
    }
    // --- END MODIFICATION ---

    if(session.user.id === userId) {
        throw new Error("Cannot delete yourself");
    }

    try{
        // --- MODIFICATION: Ensure only USER role can be deleted ---
        const userToDelete = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true }
        });

        if (!userToDelete) {
            return { error: "User not found." };
        }

        if (userToDelete.role !== UserRole.USER) {
            return { error: `Cannot hard-delete this role. Please "Deactivate" ${userToDelete.role} accounts instead.` };
        }
        
        await prisma.user.delete({
            where: {
                id: userId,
                role: UserRole.USER // Explicitly only delete USERs
            },
        });
        // --- END MODIFICATION ---

        if(session.user.id === userId){
            await auth.api.signOut({
                headers: headersList,
            })
            redirect("/auth/login")
        }
        revalidatePath("/admin/dashboard");
        revalidatePath("/super/dashboard"); // Revalidate super admin dash too
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