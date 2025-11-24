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
  Menu,
  BookUser, // Icon for Registers
  FileText, // Icon for Declarations
  Search, // Icon for Trackers
} from "lucide-react";
import Link from "next/link";
import { NotificationBell } from "./notification-bell";
import { CMSessionIndicator } from "./cm-session-indicator";
import { UserRole } from "@/generated/prisma";
import { ScrollArea } from "./ui/scroll-area";
import { ReturnButton } from "./return-button"; // <-- IMPORTING RETURN BUTTON

// Interface for the links
interface DropdownLink {
  href: string;
  label: string;
  description: string;
}

// --- RE-GROUPED LINKS based on your old design ---
const declarationLinks: DropdownLink[] = [
  {
    href: "/user/forms/codeOfConduct",
    label: "Code of Conduct",
    description: "Submit your code of conduct",
  },
  {
    href: "/user/forms/declarationUndertaking",
    label: "Declaration Cum Undertaking",
    description: "Submit your declaration",
  },
  {
    href: "/user/forms/monthlyCompliance",
    label: "Monthly Compliance",
    description: "Fill out monthly compliance",
  },
  {
    href: "/user/forms/assetManagement",
    label: "Asset Management",
    description: "Declare your assets",
  },
  {
    href: "/user/forms/telephoneDeclaration",
    label: "Telephone Declaration",
    description: "Declare telephone lines",
  },
  {
    href: "/user/forms/productDeclaration",
    label: "Declaration of Product",
    description: "Declare your products",
  },
  {
    href: "/user/forms/noDuesDeclaration",
    label: "No Dues Declaration",
    description: "Monthly no dues",
  },
];

const registerLinks: DropdownLink[] = [
  {
    href: "/user/forms/agencyVisit",
    label: "Agency Visit Details",
    description: "Log your visits",
  },
  {
    href: "/user/forms/manpowerRegister",
    label: "Agency Manpower Register",
    description: "Manage manpower",
  },
  {
    href: "/user/forms/paymentRegister",
    label: "Payment Register",
    description: "Log payments",
  },
];

const trackerLinks: DropdownLink[] = [
  {
    href: "/user/show-cause",
    label: "Show Cause Notices",
    description: "Respond to formal notices",
  },
  {
    href: "/user/advisories",
    label: "Advisories",
    description: "View all admin announcements",
  },
  {
    href: "/user/forms/penaltyMatrix",
    label: "Agency Penalty Matrix",
    description: "View all finalized penalties",
  },
  {
    href: "/user/forms/trainingTracker",
    label: "Agency Training Tracker",
    description: "Track training",
  },
  {
    href: "/user/forms/proactiveEscalation",
    label: "Proactive Escalation",
    description: "Track escalations",
  },
  {
    href: "/user/forms/escalationDetails",
    label: "Escalation Details",
    description: "Details of escalations",
  },
  {
    href: "/user/forms/repoKitTracker",
    label: "Repo Kit Tracker",
    description: "Track repo kits",
  },
];
// --- End of link lists ---

export function PageHeader({
  returnHref = "/user/dashboard",
  returnLabel = "Back to Dashboard",
}) {
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

  // Render navigation links only for Agency (USER) role
  const renderAgencyLinks = () => {
    if (user.role !== UserRole.USER) {
      return null; // All other roles see no extra links
    }

    // Agency users see desktop dropdowns
    return (
      <div className="hidden md:flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost">
              <FileText className="mr-2 h-4 w-4" /> Declarations{" "}
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-80">
            <DropdownMenuLabel>Declarations</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <ScrollArea className="h-[300px]">
              {declarationLinks.map((link) => (
                <DropdownMenuItem key={link.href} asChild>
                  <Link href={link.href}>
                    <div>
                      <p>{link.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {link.description}
                      </p>
                    </div>
                  </Link>
                </DropdownMenuItem>
              ))}
            </ScrollArea>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost">
              <BookUser className="mr-2 h-4 w-4" /> Registers{" "}
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-80">
            <DropdownMenuLabel>Registers</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {registerLinks.map((link) => (
              <DropdownMenuItem key={link.href} asChild>
                <Link href={link.href}>
                  <div>
                    <p>{link.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {link.description}
                    </p>
                  </div>
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost">
              <Search className="mr-2 h-4 w-4" /> Trackers{" "}
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-80">
            <DropdownMenuLabel>Trackers & Audits</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <ScrollArea className="h-[300px]">
              {trackerLinks.map((link) => (
                <DropdownMenuItem key={link.href} asChild>
                  <Link href={link.href}>
                    <div>
                      <p>{link.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {link.description}
                      </p>
                    </div>
                  </Link>
                </DropdownMenuItem>
              ))}
            </ScrollArea>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  // Render the mobile menu only for Agency (USER) role
  const renderAgencyMobileMenu = () => {
    if (user.role !== UserRole.USER) {
      return null;
    }

    return (
      <div className="md:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <ScrollArea className="h-[calc(100vh-100px)]">
              <DropdownMenuLabel>Declarations</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {declarationLinks.map((link) => (
                <DropdownMenuItem key={link.href} asChild>
                  <Link href={link.href}>
                    <div>
                      <p>{link.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {link.description}
                      </p>
                    </div>
                  </Link>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Registers</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {registerLinks.map((link) => (
                <DropdownMenuItem key={link.href} asChild>
                  <Link href={link.href}>
                    <div>
                      <p>{link.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {link.description}
                      </p>
                    </div>
                  </Link>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Trackers</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {trackerLinks.map((link) => (
                <DropdownMenuItem key={link.href} asChild>
                  <Link href={link.href}>
                    <div>
                      <p>{link.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {link.description}
                      </p>
                    </div>
                  </Link>
                </DropdownMenuItem>
              ))}
            </ScrollArea>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/90 backdrop-blur-sm dark:bg-slate-900/90">
      <div className="container mx-auto flex h-16 items-center justify-between px-6">
        <nav className="flex items-center gap-4">
          {/* RESTORED RETURN BUTTON */}
          <ReturnButton href={returnHref} label={returnLabel} />
          {/* Desktop links are rendered here */}
          {renderAgencyLinks()}
        </nav>
        <div className="flex items-center gap-2 sm:gap-4">
          <CMSessionIndicator />
          {/* Notification Bell is visible to all roles */}
          <NotificationBell />

          {/* Mobile Menu (Agency Only) */}
          {renderAgencyMobileMenu()}
        </div>
      </div>
    </header>
  );
}