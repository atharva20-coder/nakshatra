import { createAuthClient } from "better-auth/react"
import {inferAdditionalFields, adminClient, customSessionClient, magicLinkClient} from "better-auth/client/plugins"
import {auth} from "@/lib/auth"
import {ac, roles} from "@/lib/permissions"

export const authClient = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_API_URL,
    plugins: [inferAdditionalFields<typeof auth>(), adminClient({
        ac,
        roles
    }), customSessionClient<typeof auth>(),
magicLinkClient()]
})

export const { signUp, signOut, signIn, useSession, admin, sendVerificationEmail, forgetPassword, resetPassword, updateUser } = authClient;