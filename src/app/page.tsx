// src/app/page.tsx

'use client';
import Link from 'next/link';
import Image from 'next/image';
import { Playfair_Display, Inter } from 'next/font/google';
import { GetStartedButton } from '@/components/get-started-button';
import { 
  ShieldCheck, 
  Users, 
  FileText, 
  BarChart3, 
  CheckCircle2, 
  Building2, 
  UserCog 
} from 'lucide-react';

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export default function LandingPage() {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className={`min-h-screen bg-white relative overflow-hidden ${inter.variable}`}>
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto flex justify-between items-center py-4 px-6 md:px-12">
          <div className="flex items-center gap-2">
            {/* Optional: Add a small logo image here if available */}
            <div className="text-2xl font-bold text-rose-900 tracking-tight">
              E-Nakshatra
            </div>
          </div>
          
          <div className="hidden md:flex space-x-8 items-center text-sm font-medium text-gray-600">
            <button onClick={() => scrollToSection('features')} className="hover:text-rose-900 transition-colors">
              Features
            </button>
            <button onClick={() => scrollToSection('stakeholders')} className="hover:text-rose-900 transition-colors">
              For Stakeholders
            </button>
            <button onClick={() => scrollToSection('about')} className="hover:text-rose-900 transition-colors">
              About
            </button>
            <div className="flex items-center gap-4 pl-4 border-l border-gray-200">
              <Link 
                href="/auth/login" 
                className="text-rose-900 hover:text-rose-950 font-semibold px-4 py-2 hover:bg-rose-50 rounded-md transition-colors"
              >
                Login
              </Link>
              <GetStartedButton />
            </div>
          </div>
          
          {/* Mobile menu placeholder */}
          <div className="md:hidden">
            <Link href="/auth/login" className="text-rose-900 font-bold text-sm">
              Login
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 md:px-12 pt-12 md:pt-20 pb-20">
        <div className="flex flex-col md:flex-row items-center gap-12 md:gap-20">
          <div className="flex-1 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 text-xs font-bold text-rose-800 bg-rose-100 rounded-full uppercase tracking-wider">
              <span className="w-2 h-2 bg-rose-600 rounded-full animate-pulse"></span>
              Compliance Portal
            </div>
            
            <h1 className={`${playfair.variable} font-playfair text-4xl md:text-6xl font-bold mb-6 leading-[1.1] text-gray-900`}>
              Streamlining Agency <br/>
              <span className="text-rose-900">Governance & Audit</span>
            </h1>
            
            <p className="text-lg text-gray-600 mb-8 leading-relaxed max-w-lg">
              The centralized ecosystem for Axis Bank to manage third-party agencies, automate digital audits, and ensure 100% regulatory compliance through real-time tracking.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <GetStartedButton />
              <Link
                href="/auth/login"
                className="inline-flex items-center justify-center px-8 py-3 text-base font-semibold text-rose-900 bg-white border-2 border-rose-100 rounded-md hover:bg-rose-50 hover:border-rose-200 transition-all shadow-sm"
              >
                Existing User Login
              </Link>
            </div>

            <div className="flex items-center gap-8 text-sm text-gray-500 font-medium">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span>Regulatory Compliant</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span>Real-time Analytics</span>
              </div>
            </div>
          </div>

          <div className="flex-1 relative w-full flex justify-center md:justify-end">
            <div className="relative z-10 w-full max-w-[600px]">
               {/* Blob Background */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 w-[120%] h-[120%] opacity-60">
                <Image
                  src="/landing/blob-shape 1.png"
                  alt="Background shape"
                  fill
                  className="object-contain animate-pulse"
                  style={{ animationDuration: '8s' }}
                />
              </div>
              {/* Main Illustration */}
              <Image
                src="/landing/Illustration.png"
                alt="Compliance Dashboard Illustration"
                width={700}
                height={500}
                className="object-contain drop-shadow-2xl transform hover:scale-105 transition-transform duration-500"
                priority
              />
            </div>
          </div>
        </div>
      </main>

      {/* Features Grid */}
      <section id="features" className="bg-slate-50 py-24">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className={`${playfair.variable} font-playfair text-3xl md:text-4xl font-bold text-gray-900 mb-4`}>
              Comprehensive Compliance Suite
            </h2>
            <p className="text-gray-600">
              Designed to bridge the gap between banking regulations and on-ground agency operations.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: ShieldCheck,
                title: "Digital Audits",
                desc: "Replace paper trails with geo-tagged, timestamped digital audit reports ensuring absolute authenticity."
              },
              {
                icon: FileText,
                title: "Automated Reporting",
                desc: "Generate Show Cause Notices (SCN), monthly compliance reports, and asset trackers with a single click."
              },
              {
                icon: BarChart3,
                title: "Performance Matrix",
                desc: "Track agency health scores based on audit parameters, penalty matrix, and operational efficiency."
              }
            ].map((feature, idx) => (
              <div key={idx} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center mb-6">
                  <feature.icon className="w-6 h-6 text-rose-900" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stakeholders Section */}
      <section id="stakeholders" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="mb-16">
            <h2 className={`${playfair.variable} font-playfair text-3xl md:text-4xl font-bold text-gray-900 mb-4`}>
              Built for the entire ecosystem
            </h2>
            <p className="text-gray-600 max-w-2xl">
              E-Nakshatra connects all stakeholders on a single unified platform.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Agency Card */}
            <div className="group p-6 rounded-xl border border-gray-200 hover:border-rose-200 hover:bg-rose-50/50 transition-all">
              <Building2 className="w-8 h-8 text-gray-400 group-hover:text-rose-700 mb-4 transition-colors" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">Agencies</h3>
              <p className="text-sm text-gray-600 mb-4">
                Manage staff, submit monthly declarations, and track compliance status.
              </p>
              <Link href="/auth/login" className="text-sm font-semibold text-rose-700 hover:text-rose-900 flex items-center gap-1">
                Agency Login <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>

            {/* Auditor Card */}
            <div className="group p-6 rounded-xl border border-gray-200 hover:border-rose-200 hover:bg-rose-50/50 transition-all">
              <FileText className="w-8 h-8 text-gray-400 group-hover:text-rose-700 mb-4 transition-colors" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">Auditors</h3>
              <p className="text-sm text-gray-600 mb-4">
                Perform scheduled audits, upload evidence, and submit field reports.
              </p>
              <Link href="/auth/login" className="text-sm font-semibold text-rose-700 hover:text-rose-900 flex items-center gap-1">
                Auditor Login <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>

            {/* Collection Manager Card */}
            <div className="group p-6 rounded-xl border border-gray-200 hover:border-rose-200 hover:bg-rose-50/50 transition-all">
              <UserCog className="w-8 h-8 text-gray-400 group-hover:text-rose-700 mb-4 transition-colors" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">Collection Managers</h3>
              <p className="text-sm text-gray-600 mb-4">
                Oversee agency performance and approve critical compliance requests.
              </p>
              <Link href="/auth/login" className="text-sm font-semibold text-rose-700 hover:text-rose-900 flex items-center gap-1">
                Manager Login <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>

            {/* Admin/Employee Card */}
            <div className="group p-6 rounded-xl border border-gray-200 hover:border-rose-200 hover:bg-rose-50/50 transition-all">
              <Users className="w-8 h-8 text-gray-400 group-hover:text-rose-700 mb-4 transition-colors" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">Sper Admins & Admins</h3>
              <p className="text-sm text-gray-600 mb-4">
                Central administration, master data management, and holistic reporting.
              </p>
              <Link href="/auth/login" className="text-sm font-semibold text-rose-700 hover:text-rose-900 flex items-center gap-1">
                Super Admin/Admin Login <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-1 md:col-span-2">
              <h4 className="text-2xl font-bold text-white mb-4">E-Nakshatra</h4>
              <p className="text-gray-400 max-w-sm leading-relaxed">
                The official Agency Governance & Compliance portal ensuring transparency and regulatory adherence across the ecosystem.
              </p>
            </div>
            
            <div>
              <h5 className="text-white font-semibold mb-4">Quick Links</h5>
              <ul className="space-y-2 text-sm">
                <li><button onClick={() => scrollToSection('features')} className="hover:text-white transition-colors">Key Features</button></li>
                <li><button onClick={() => scrollToSection('stakeholders')} className="hover:text-white transition-colors">Stakeholder Login</button></li>
                <li><Link href="/auth/register" className="hover:text-white transition-colors">Register New Agency</Link></li>
              </ul>
            </div>

            <div>
              <h5 className="text-white font-semibold mb-4">Support</h5>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Help Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact Support</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-500">
              &copy; {new Date().getFullYear()} E-Nakshatra Portal. All rights reserved.
            </p>
            <div className="flex items-center gap-2 text-sm font-medium text-rose-400 bg-rose-950/30 px-4 py-2 rounded-full border border-rose-900/50">
              <span>Developed by Atharva Joshi</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}