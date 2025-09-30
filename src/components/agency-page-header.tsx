"use client";

import React, { useState } from "react";
import { ReturnButton } from "@/components/return-button";
import { Input } from "@/components/ui/input";
import { ChevronDown, Search, Menu, X } from "lucide-react";
import Link from "next/link";

// Props for the header component
interface PageHeaderProps {
  returnHref: string;
  returnLabel: string;
}

// Type for the links in the dropdown
interface DropdownLink {
  href: string;
  label: string;
  description?: string;
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
    <div className="relative group py-2 -my-2">
      <button className="flex items-center gap-2 text-sm font-medium hover:text-rose-600 dark:hover:text-rose-400 transition-colors">
        {label}
        <ChevronDown className="w-4 h-4" />
      </button>
      <div className="absolute right-0 hidden group-hover:block w-80 bg-white dark:bg-gray-700 shadow-lg rounded-md mt-2 py-2 z-10 border border-gray-200 dark:border-gray-600">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="block px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
          >
            <div className="font-medium text-gray-900 dark:text-gray-100">
              {link.label}
            </div>
            {link.description && (
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {link.description}
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
};

// Data for the dropdown menus with descriptions
const declarationLinks: DropdownLink[] = [
    { 
      href: "/forms/codeOfConduct", 
      label: "Code Of Conduct",
      description: "Declaration of adherence to conduct guidelines"
    },
    { 
      href: "/forms/declarationCumUndertaking", 
      label: "Declaration Cum Undertaking",
      description: "Agency undertaking with collection manager details"
    },
    { 
      href: "/forms/monthlyCompliance", 
      label: "Monthly Compliance Declaration",
      description: "Monthly compliance parameter reporting"
    },
    { 
      href: "/forms/assetManagement", 
      label: "Asset Management Declaration",
      description: "IT assets and system management details"
    },
    { 
      href: "/forms/telephoneDeclaration", 
      label: "Telephone Lines Declaration",
      description: "Telephone line usage and recording details"
    },
    { 
      href: "/forms/productDeclaration", 
      label: "Declaration Of Product",
      description: "Product allocation and collection manager details"
    },
];

const registerLinks: DropdownLink[] = [
    { 
      href: "/forms/agencyVisits", 
      label: "Agency Visit Details",
      description: "Details of bank visits by agency personnel"
    },
    { 
      href: "/forms/manpowerRegister", 
      label: "Agency Manpower Register",
      description: "Employee details and management information"
    },
    { 
      href: "/forms/paymentRegister", 
      label: "Payment Register",
      description: "Payment receipt and verification tracking"
    },
];

const trackerLinks: DropdownLink[] = [
    { 
      href: "/forms/penaltyMatrix", 
      label: "Agency Penalty Matrix",
      description: "Penalty tracking and corrective actions"
    },
    { 
      href: "/forms/trainingTracker", 
      label: "Agency Training Tracker",
      description: "Training sessions and attendance tracking"
    },
    { 
      href: "/forms/proactiveEscalation", 
      label: "Proactive Escalation Management Tracker",
      description: "Customer escalation management tracking"
    },
    { 
      href: "/forms/escalationDetails", 
      label: "Escalation Details",
      description: "Detailed escalation case management"
    },
    { 
      href: "/forms/repoKitTracker", 
      label: "Repo Kit Tracker",
      description: "Repository kit issuance and return tracking"
    },
];

const allLinks = [
  { title: 'Declarations', links: declarationLinks },
  { title: 'Registers', links: registerLinks },
  { title: 'Trackers', links: trackerLinks },
];

// New AccordionItem component for the mobile menu
const AccordionItem = ({
  title,
  links,
  isOpen,
  onClick,
  onLinkClick,
}: {
  title: string;
  links: DropdownLink[];
  isOpen: boolean;
  onClick: () => void;
  onLinkClick: () => void;
}) => {
  return (
    <div className="border-b border-gray-200 dark:border-gray-700">
      <button
        onClick={onClick}
        className="flex w-full items-center justify-between px-4 py-4 text-left font-bold text-lg text-rose-800 dark:text-rose-300"
      >
        <span>{title}</span>
        <ChevronDown
          className={`h-5 w-5 transition-transform duration-300 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? "max-h-[1000px]" : "max-h-0"
        }`}
      >
        <div className="flex flex-col space-y-1 p-4 pt-0">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={onLinkClick}
              className="block rounded-md px-4 py-3 text-base hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {link.label}
              {link.description && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {link.description}
                </p>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};


export const PageHeader = ({ returnHref, returnLabel }: PageHeaderProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);

  const handleAccordionClick = (title: string) => {
    setOpenAccordion(openAccordion === title ? null : title);
  };
  
  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
      <div className="container mx-auto">
        {/* Main Header Bar */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex-shrink-0">
            <ReturnButton href={returnHref} label={returnLabel} />
          </div>

          {/* Desktop Search Bar */}
          <div className="relative hidden md:flex flex-grow mx-8 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="search"
              placeholder="Search forms..."
              className="pl-10 w-full"
            />
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex flex-shrink-0 items-center gap-8">
            <DropdownMenu label="Declarations" links={declarationLinks} />
            <DropdownMenu label="Registers" links={registerLinks} />
            <DropdownMenu label="Trackers" links={trackerLinks} />
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button onClick={() => setIsMenuOpen(true)} className="p-2">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Open Menu</span>
            </button>
          </div>
        </div>
        
        {/* Mobile Search Bar */}
        <div className="mt-4 md:hidden">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="search"
                placeholder="Search forms..."
                className="pl-10 w-full"
              />
            </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white p-4 dark:bg-gray-900">
          <div className="mb-8 flex items-center justify-between">
             <div className="text-2xl font-bold">Nakshatra</div>
             <button onClick={() => setIsMenuOpen(false)} className="p-2">
                <X className="h-6 w-6" />
                <span className="sr-only">Close Menu</span>
             </button>
          </div>
          {/* Make the nav scrollable */}
          <nav className="flex-1 overflow-y-auto">
            {allLinks.map((section) => (
              <AccordionItem
                key={section.title}
                title={section.title}
                links={section.links}
                isOpen={openAccordion === section.title}
                onClick={() => handleAccordionClick(section.title)}
                onLinkClick={() => setIsMenuOpen(false)}
              />
            ))}
          </nav>
        </div>
      )}
    </header>
  );
};

