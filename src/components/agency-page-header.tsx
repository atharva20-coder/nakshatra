"use client";

import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/components/sign-out-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronDown,
  User,
  LayoutDashboard,
  FileText,
  Gavel,
  ShieldAlert, // For SCN
  Megaphone,  // For Advisories
} from "lucide-react";
import Link from "next/link";
import { NotificationBell } from "./notification-bell";
import { CMSessionIndicator } from "./cm-session-indicator";
import { UserRole } from "@/generated/prisma";

interface DropdownLink {
  href: string;
  label: string;
  description: string;
}

const formLinks: DropdownLink[] = [
  { href: "/user/forms/codeOfConduct", label: "Code of Conduct", description: "Submit your code of conduct" },
  { href: "/user/forms/declarationUndertaking", label: "Declaration Cum Undertaking", description: "Submit your declaration" },
  { href: "/user/forms/agencyVisit", label: "Agency Visit Details", description: "Log your visits" },
  { href: "/user/forms/monthlyCompliance", label: "Monthly Compliance", description: "Fill out monthly compliance" },
  { href: "/user/forms/assetManagement", label: "Asset Management", description: "Declare your assets" },
  { href: "/user/forms/telephoneDeclaration", label: "Telephone Declaration", description: "Declare telephone lines" },
  { href: "/user/forms/manpowerRegister", label: "Agency Manpower Register", description: "Manage manpower" },
  { href: "/user/forms/productDeclaration", label: "Declaration of Product", description: "Declare your products" },
  { href: "/user/forms/trainingTracker", label: "Agency Training Tracker", description: "Track training" },
  { href: "/user/forms/proactiveEscalation", label: "Proactive Escalation", description: "Track escalations" },
  { href: "/user/forms/escalationDetails", label: "Escalation Details", description: "Details of escalations" },
  { href: "/user/forms/paymentRegister", label: "Payment Register", description: "Log payments" },
  { href: "/user/forms/repoKitTracker", label: "Repo Kit Tracker", description: "Track repo kits" },
  { href: "/user/forms/noDuesDeclaration", label: "No Dues Declaration", description: "Monthly no dues" },
];

const trackerLinks: DropdownLink[] = [
  // --- NEW SCN LINK ---
  { 
    href: "/user/show-cause", 
    label: "Show Cause Notices",
    description: "Respond to formal notices from the admin"
  },
  // --- NEW ADVISORY LINK ---
  {
    href: "/user/advisories",
    label: "Advisories",
    description: "View all admin advisories and announcements"
  },
  // --- UPDATED PENALTY MATRIX LINK ---
  { 
    href: "/user/forms/penaltyMatrix", 
    label: "Agency Penalty Matrix",
    description: "View all finalized penalties"
  },
];

export function PageHeader({ returnHref = "/user/dashboard", returnLabel = "Back to Dashboard" }) {
  const { data: session } = useSession();

  if (!session) {
    return (
      <header className="sticky top-0 z-50 w-full border-b bg-white/90 backdrop-blur-sm dark:bg-slate-900/90">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <Link href="/" className="font-bold">
            Agency Portal
          </Link>
          <Button asChild>
            <Link href="/auth/login">Login</Link>
          </Button>
        </div>
      </header>
    );
  }

  const { user } = session;

  const renderLinks = () => {
    switch (user.role) {
      case UserRole.USER:
        return (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost">
                  Forms <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-80">
                <DropdownMenuLabel>Agency Forms</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {formLinks.map((link) => (
                  <DropdownMenuItem key={link.href} asChild>
                    <Link href={link.href}>
                      <div>
                        <p>{link.label}</p>
                        <p className="text-xs text-muted-foreground">{link.description}</p>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost">
                  Trackers & Audits <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-80">
                <DropdownMenuLabel>Trackers & Audits</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {trackerLinks.map((link) => (
                  <DropdownMenuItem key={link.href} asChild>
                    <Link href={link.href}>
                      <div>
                        <p>{link.label}</p>
                        <p className="text-xs text-muted-foreground">{link.description}</p>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        );
      case UserRole.ADMIN:
      case UserRole.SUPER_ADMIN:
        return (
          <>
            <Button variant="ghost" asChild>
              <Link href="/admin/forms">
                <FileText className="mr-2 h-4 w-4" /> View Forms
              </Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/admin/approvals">
                <Gavel className="mr-2 h-4 w-4" /> Approvals
              </Link>
            </Button>
          </>
        );
      case UserRole.AUDITOR:
        return (
          <Button variant="ghost" asChild>
            <Link href="/auditor/dashboard">
              <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
            </Link>
          </Button>
        );
      case UserRole.COLLECTION_MANAGER:
        return (
          <Button variant="ghost" asChild>
            <Link href="/collectionManager/dashboard">
              <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
            </Link>
          </Button>
        );
      default:
        return null;
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/90 backdrop-blur-sm dark:bg-slate-900/90">
      <div className="container mx-auto flex h-16 items-center justify-between px-6">
        <nav className="flex items-center gap-4">
          <Link href={returnHref} className="font-bold text-lg">
            Agency Portal
          </Link>
          <div className="hidden md:flex items-center gap-2">
            {renderLinks()}
          </div>
        </nav>
        <div className="flex items-center gap-4">
          <CMSessionIndicator />
          <NotificationBell />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <User className="mr-2 h-4 w-4" />
                {user.name}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile">
                  <User className="mr-2 h-4 w-4" /> Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <SignOutButton />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}