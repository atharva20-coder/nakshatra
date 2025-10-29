// src/lib/permissions.ts
import { UserRole } from "@/generated/prisma";
import {createAccessControl} from "better-auth/plugins/access"
import {defaultStatements, adminAc} from "better-auth/plugins/admin/access"

const statements = {
    ...defaultStatements,
    posts: ["create", "read", "update", "delete", "update:own", "delete:own","ban", "unban"],
    // --- Define ALL possible actions for audits and observations ---
    audits: ["create", "read", "update", "delete", "read:own", "update:own"], // Added delete, read:own, update:own
    observations: ["create", "read", "update", "delete", "read:own"], // Added delete, read:own
    penalties: ["create", "read", "update", "delete", "read:own"], // Added penalties statements as well
    // ---
} as const; // Ensure 'as const' is used for type inference

export const ac = createAccessControl(statements)

export const roles = {
    [UserRole.USER]: ac.newRole({
        posts: ["create", "read", "update:own", "delete:own"],
        // Agencies can read their own audits, observations, penalties
        audits: ["read:own"],
        observations: ["read:own"],
        penalties: ["read:own"],
    }),
    [UserRole.SUPER_ADMIN]: ac.newRole({
        ...adminAc.statements,
        posts: ["create", "read", "update", "delete", "update:own", "delete:own", "ban", "unban"],
        audits: ["create", "read", "update", "delete"], // Super Admins can manage all
        observations: ["create", "read", "update", "delete"],
        penalties: ["create", "read", "update", "delete"],
    }),
    [UserRole.ADMIN]: ac.newRole({
        ...adminAc.statements,
        posts: ["create", "read", "update", "delete", "update:own", "delete:own"],
        audits: ["read", "update"], // Admins review/manage audits
        observations: ["read", "update"], // Admins review/send observations
        penalties: ["create", "read", "update"], // Admins assign/submit penalties
    }),
    // --- AUDITOR ROLE ---
    [UserRole.AUDITOR]: ac.newRole({
        audits: ["create", "read:own", "update:own"], // Corrected permissions based on updated statements
        observations: ["create", "read:own"], // Corrected permissions based on updated statements
        // posts: ["read"] // Removed placeholder or ensure 'posts' allows 'read'
    }),
    // --- END AUDITOR ROLE ---
    [UserRole.COLLECTION_MANAGER]: ac.newRole({
        posts: ["create", "read", "update", "delete"]
        // Add specific permissions if needed for Collection Managers later
    })
}

// Type helper for permissions (optional but recommended)
export type AppAccessControl = typeof ac;
export type AppRoles = typeof roles;