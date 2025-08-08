// src/app/api/[tableName]/route.ts
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PrismaClient } from "@/generated/prisma";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

// A list of table names that are allowed to be accessed via this API route for security.
const allowedTables = [
  "codeOfConduct", "declarationCumUndertaking", "monthlyComplianceDeclaration",
  "assetManagementDeclaration", "telephoneLinesDeclaration", "agencyManpowerRegister",
  "declarationOfProduct", "agencyPenaltyMatrix", "agencyTrainingTracker",
  "proactiveEscalationManagement", "escalationDetails", "paymentRegister", "repoKitTracker",
  "agencyVisit"
] as const; // Use 'as const' for stricter type checking.

// Create a type that represents only the allowed table names.
type AllowedTableName = typeof allowedTables[number];

// Create a type for the Prisma client that only includes the delegates for the allowed tables.
type PrismaDynamicClient = Pick<PrismaClient, AllowedTableName>;

/**
 * Handles POST requests to create a new record in a specified table.
 * @param req - The Next.js request object.
 * @param params - The route parameters, containing the table name.
 * @returns A JSON response with the newly created record or an error.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { tableName: string } }
) {
  // headers() is synchronous and returns a ReadonlyHeaders object.
  const headersList = await headers();
  // We create a new Headers object to match the expected type for getSession.
  const session = await auth.api.getSession({ headers: new Headers(headersList) });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tableName } = params;
  // Check if the provided table name is in our allowed list.
  if (!allowedTables.includes(tableName as AllowedTableName)) {
    return NextResponse.json({ error: "Invalid table name" }, { status: 400 });
  }

  const body = await req.json();

  try {
    // Cast prisma to our specific dynamic client type for improved type safety.
    const tableDelegate = (prisma as PrismaDynamicClient)[tableName as AllowedTableName];
    
    // A final 'any' cast is needed here because TypeScript cannot dynamically
    // infer the specific method signature for 'create' based on the tableName string.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newRecord = await (tableDelegate as any).create({
      data: {
        ...body,
        userId: session.user.id, // Ensure the record is associated with the current user.
      },
    });
    return NextResponse.json(newRecord, { status: 201 });
  } catch (error) {
    console.error(`[API] Failed to create record in ${tableName}:`, error);
    return NextResponse.json(
      { error: `Failed to create record in ${tableName}` },
      { status: 500 }
    );
  }
}

/**
 * Handles GET requests to fetch all records for the current user from a specified table.
 * @param req - The Next.js request object.
 * @param params - The route parameters, containing the table name.
 * @returns A JSON response with the fetched records or an error.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { tableName: string } }
) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: new Headers(headersList) });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tableName } = params;
  if (!allowedTables.includes(tableName as AllowedTableName)) {
    return NextResponse.json({ error: "Invalid table name" }, { status: 400 });
  }

  try {
    const tableDelegate = (prisma as PrismaDynamicClient)[tableName as AllowedTableName];
    
    // Similar to the POST handler, an 'any' cast is used for the dynamic method call.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const records = await (tableDelegate as any).findMany({
      where: {
        userId: session.user.id, // Only fetch records for the logged-in user.
      },
    });
    return NextResponse.json(records, { status: 200 });
  } catch (error) {
    console.error(`[API] Failed to fetch records from ${tableName}:`, error);
    return NextResponse.json(
      { error: `Failed to fetch records from ${tableName}` },
      { status: 500 }
    );
  }
}
