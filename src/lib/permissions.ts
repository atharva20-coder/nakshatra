import { UserRole } from "@/generated/prisma";
import {createAccessControl} from "better-auth/plugins/access"
import {defaultStatements, adminAc} from "better-auth/plugins/admin/access"

const statements = {
    ...defaultStatements,
    posts: ["create", "read", "update", "delete", "update:own", "delete:own","ban", "unban"]
} as const;

export const ac = createAccessControl(statements)

export const roles = {
    [UserRole.USER]: ac.newRole({
        posts: ["create", "read", "update:own", "delete:own"]
    }),
    [UserRole.ADMIN]: ac.newRole({
        ...adminAc.statements,
        posts: ["create", "read", "update", "delete", "update:own", "delete:own", "ban", "unban"]
    }),
    [UserRole.AUDITOR]: ac.newRole({
        posts: ["read"]
    }),
    [UserRole.COLLECTION_MANAGER]: ac.newRole({
        posts: ["create", "read", "update", "delete"]
    })
}