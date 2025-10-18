// ============================================
// auth.ts — Authentication Configuration
// ============================================

import { betterAuth, type BetterAuthOptions } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { admin, customSession, magicLink } from "better-auth/plugins";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/argon2";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { getValidDomains, normalizeName } from "@/lib/utils";
import { UserRole } from "@/generated/prisma";
import { ac, roles } from "@/lib/permissions";
import { sendEmailAction } from "@/actions/send-email.action";


// ============================================
// AUTH CONFIGURATION
// ============================================
const options = {
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  // --- Google OAuth setup ---
  socialProviders: {
    google: {
      clientId: String(process.env.GOOGLE_CLIENT_ID),
      clientSecret: String(process.env.GOOGLE_CLIENT_SECRET),
    },
  },

  // --- Email + Password Authentication ---
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    autoSignIn: false,
    password: {
      hash: hashPassword,
      verify: verifyPassword,
    },
    requireEmailVerification: true,
    resetPasswordTokenExpiresIn: 60 * 60, // 1 hour

    // Custom email for password reset
    sendResetPassword: async ({ user, url }) => {
      await sendEmailAction({
        to: user.email,
        subject: "Reset your password",
        meta: {
          description: "Click the button below to reset your password.",
          link: url,
        },
      });
    },
  },

  // --- Email Verification Setup ---
  emailVerification: {
    sendOnSignUp: true,
    expiresIn: 60 * 60, // 1 hour
    autoSignInAfterVerification: true, // Auto-login after verification
    sendVerificationEmail: async ({ user, url }) => {
      const link = new URL(url);
      link.searchParams.set("callbackURL", "/auth/verify");

      await sendEmailAction({
        to: user.email,
        subject: "Verify your email",
        meta: {
          description: "Click the button below to verify your email address.",
          link: String(link),
        },
      });
    },
  },

  // --- Global Middleware Hooks ---
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      // Restrict email domains during sign-up
      if (ctx.path === "/sign-up/email") {
        const email = String(ctx.body.email);
        const domain = email.split("@")[1];

        const VALID_DOMAINS = getValidDomains;
        if (!VALID_DOMAINS().includes(domain)) {
          throw new APIError("BAD_REQUEST", {
            message: "Invalid domain. Please use a valid email domain.",
          });
        }

        return {
          context: {
            ...ctx,
            body: {
              ...ctx.body,
              name: normalizeName(ctx.body.name),
            },
          },
        };
      }

      // Normalize name before magic link login
      if (ctx.path === "/sign-in/magic-link") {
        return {
          context: {
            ...ctx,
            body: { ...ctx.body, name: normalizeName(ctx.body.name) },
          },
        };
      }

      // Normalize name before user update
      if (ctx.path === "/update-user") {
        return {
          context: {
            ...ctx,
            body: { ...ctx.body, name: normalizeName(ctx.body.name) },
          },
        };
      }
    }),
  },

  // ============================================
  // DATABASE HOOKS — Assign Role During User Creation
  // ============================================
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          // ✅ NEW ADDITIONS BELOW

          // 1️⃣ Fetch allowed SUPER_ADMIN and ADMIN emails from .env
          const superAdminEmails = process.env.SUPER_ADMIN_EMAILS?.split(";");
          const adminEmails = process.env.ADMIN_EMAIL?.split(";");

          // 2️⃣ Check if email belongs to Axis Bank (auto-admin)
          const isAxisBankEmail = user.email.endsWith("@axisbank.com");

          // 3️⃣ Assign roles based on email
          if (superAdminEmails?.includes(user.email)) {
            // 👑 Super Admin (highest privilege)
            return { data: { ...user, role: UserRole.SUPER_ADMIN } };
          }

          if (adminEmails?.includes(user.email) || isAxisBankEmail) {
            // 🧩 Regular Admin (or Axis Bank domain)
            return { data: { ...user, role: UserRole.ADMIN } };
          }

          // 👤 Default user role
          return { data: user };
        },
      },
    },
  },

  // --- Extend User Schema with Role Field ---
  user: {
    additionalFields: {
      role: {
        type: [
          "USER",
          "ADMIN",
          "AUDITOR",
          "COLLECTION_MANAGER",
          "SUPER_ADMIN",
        ] as Array<UserRole>,
        input: false,
      },
    },
  },

  // --- Session Configuration ---
  session: {
    expiresIn: 30 * 24 * 60 * 60, // 30 days
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },

  // --- Disable Account Linking ---
  account: {
    accountLinking: {
      enabled: false,
    },
  },

  // --- Advanced Config (Optional) ---
  advanced: {
    database: {
      generateId: false,
    },
  },

  // ============================================
  // PLUGINS SECTION
  // ============================================
  plugins: [
    nextCookies(),

    // ✅ UPDATED: Include SUPER_ADMIN as a valid admin role
    admin({
      defaultRole: UserRole.USER,
      adminRoles: [UserRole.ADMIN, UserRole.SUPER_ADMIN], // <--- NEW ADDITION
      ac,
      roles,
    }),

    // Magic Link plugin with custom email sender
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        await sendEmailAction({
          to: email,
          subject: "Magic Link Login",
          meta: {
            description: "Please click the link below to log in.",
            link: String(url),
          },
        });
      },
    }),
  ],
} satisfies BetterAuthOptions;


// ============================================
// EXPORT FINAL AUTH INSTANCE
// ============================================

export const auth = betterAuth({
  ...options,
  plugins: [
    ...(options.plugins ?? []),

    // --- Custom Session to include user details and token ---
    customSession(async ({ user, session }) => {
      return {
        session: {
          expiresAt: session.expiresAt,
          token: session.token,
          userAgent: session.userAgent,
        },
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          createdAt: user.createdAt,
          role: user.role,
        },
      };
    }, options),
  ],
});

export type ErrorCode = keyof typeof auth.$ERROR_CODES | "UNKNOWN";
