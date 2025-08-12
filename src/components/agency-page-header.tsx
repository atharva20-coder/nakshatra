"use client";

import React from "react";
import { ReturnButton } from "@/components/return-button";
import { Input } from "@/components/ui/input";
import { ChevronDown, Search } from "lucide-react";

// Props for the header component
interface PageHeaderProps {
  returnHref: string;
  returnLabel: string;
}

// Type for the links in the dropdown
interface DropdownLink {
  href: string;
  label: string;
}

// Reusable DropdownMenu component that accepts links as a prop
const DropdownMenu = ({
  label,
  links,
}: {
  label: string;
  links: DropdownLink[];
}) => {
  return (
    // FIX: Added py-2 and -my-2 to increase the hover target area without affecting layout
    <div className="relative group py-2 -my-2">
      <button className="flex items-center gap-2 text-sm font-medium hover:text-rose-600 dark:hover:text-rose-400 transition-colors">
        {label}
        <ChevronDown className="w-4 h-4" />
      </button>
      <div className="absolute right-0 hidden group-hover:block w-72 bg-white dark:bg-gray-700 shadow-lg rounded-md mt-2 py-2 z-10">
        {links.map((link) => (
          <a
            key={link.label} // Fixed: Using unique label for the key
            href={link.href}
            className="block px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600"
          >
            {link.label}
          </a>
        ))}
      </div>
    </div>
  );
};

// Data for the dropdown menus
const declarationLinks: DropdownLink[] = [
    { href: "/forms/codeOfConduct", label: "Code Of Conduct" },
    { href: "/forms/declarationCumUndertaking", label: "Declaration Cum Undertaking" },
    { href: "/forms/monthlyCompliance", label: "Monthly Compliance Declaration" },
    { href: "/forms/assetManagement", label: "Asset Management Declaration" },
    { href: "/forms/telephoneDeclaration", label: "Telephone Lines Declaration" },
    { href: "/forms/productDeclaration", label: "Declaration Of Product" },
];

const registerLinks: DropdownLink[] = [
    { href: "/forms/agencyVisits", label: "Agency Visit Details" }, // CORRECTED LINK
    { href: "/forms/manpowerRegister", label: "Agency Manpower Register" },
    { href: "/forms/paymentRegister", label: "Payment Register" },
];

const trackerLinks: DropdownLink[] = [
    { href: "/forms/penaltyMatrix", label: "Agency Penalty Matrix" },
    { href: "/forms/trainingTracker", label: "Agency Training Tracker" },
    { href: "/forms/proactiveEscalation", label: "Proactive Escalation Management Tracker" },
    { href: "/forms/escalationDetails", label: "Escalation Details" },
    { href: "/forms/repoKitTracker", label: "Repo Kit Tracker" },
];


export const PageHeader = ({ returnHref, returnLabel }: PageHeaderProps) => {
  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm p-4 border-b border-gray-200 dark:border-gray-700">
      <div className="container mx-auto flex items-center justify-between gap-8">
        {/* Left Side: Return Button */}
        <div className="flex-shrink-0">
          <ReturnButton href={returnHref} label={returnLabel} />
        </div>

        {/* Center: Search Bar */}
        <div className="relative flex-grow mx-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            type="search"
            placeholder="Search..."
            className="pl-10 w-full"
          />
        </div>

        {/* Right Side: Dropdown Menus */}
        <div className="flex-shrink-0 flex items-center gap-8">
          <DropdownMenu label="Declarations" links={declarationLinks} />
          <DropdownMenu label="Registers" links={registerLinks} />
          <DropdownMenu label="Trackers" links={trackerLinks} />
        </div>
      </div>
    </header>
  );
};
