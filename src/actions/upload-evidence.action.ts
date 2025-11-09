"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { put } from "@vercel/blob";
import { UserRole } from "@/generated/prisma";
import { getErrorMessage } from "@/lib/utils";

// 5MB limit as requested
const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export async function uploadEvidenceAction(formData: FormData) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session || session.user.role !== UserRole.USER) {
    return { error: "Forbidden: Agency access required." };
  }

  const file = formData.get("evidenceFile") as File;

  if (!file) {
    return { error: "No file provided." };
  }

  // --- Enforce 5MB limit ---
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { error: `File is too large. Max size is ${MAX_FILE_SIZE_MB}MB.` };
  }

  // Ensure Vercel Blob is set up and BLOB_READ_WRITE_TOKEN is in your .env
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error("BLOB_READ_WRITE_TOKEN is not set.");
    return { error: "File upload service is not configured." };
  }

  try {
    const blob = await put(
      `evidence/${session.user.id}/${Date.now()}-${file.name}`,
      file,
      {
        access: "public",
        contentType: file.type,
      }
    );

    if (!blob || !blob.url) {
        return { error: "File upload failed. Please check server configuration." };
    }

    return { success: true, url: blob.url };
  } catch (error) {
    return { error: getErrorMessage(error) };
  }
}