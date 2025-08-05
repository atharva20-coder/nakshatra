'use client';
import Link from 'next/link';
import Image from 'next/image';
import { Playfair_Display } from 'next/font/google';
import { GetStartedButton } from '@/components/get-started-button';

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
});

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Navigation */}
      <nav className="flex justify-between items-center py-4 px-8 md:px-16">
        <div className="text-2xl font-bold">Nakshatra</div>
        <div className="hidden md:flex space-x-8 items-center text-sm">
          <Link href="/about" className="hover:text-primary font-semibold">
            Read About Nakshtra
          </Link>
          <Link href="/agencies" className="hover:text-primary font-semibold">
            For Agencies
          </Link>
          <Link href="/auditors" className="hover:text-primary font-semibold">
            For Auditors
          </Link>
          <div className="flex space-x-4">
            <Link 
              href="/auth/login" 
              className="text-rose-900 hover:text-rose-950 font-semibold border border-rose-900 px-4 py-2 rounded-md hover:bg-rose-50 transition-colors"
            >
              Login
            </Link>
            <GetStartedButton />
          </div>
        </div>
        
        {/* Mobile menu button */}
        <div className="md:hidden">
          <button className="text-rose-900">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex flex-col md:flex-row items-center justify-between px-8 md:px-16 py-16 md:py-20 gap-12">
        <div className="flex-1 max-w-xl">
          <h1 className={`${playfair.variable} font-playfair text-5xl md:text-6xl font-bold mb-6 leading-tight`}>
            E - Nakshatra for open collaboration
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Run an organization where members get rewarded for their contributions with fractional ownership.
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <Link
              href="/auth/register"
              className="inline-block bg-rose-900 text-white px-8 py-3 rounded-md hover:bg-rose-950 transition-colors font-bold text-center"
            >
              Get Started - Sign Up
            </Link>
            <Link
              href="/auth/login"
              className="inline-block border border-rose-900 text-rose-900 px-8 py-3 rounded-md hover:bg-rose-50 transition-colors font-bold text-center"
            >
              Already have an account? Login
            </Link>
          </div>

          {/* User Type Links */}
          <div className="text-sm text-gray-600">
            <p className="mb-2">Join as:</p>
            <div className="flex flex-wrap gap-4">
              <Link 
                href="/sign-up" 
                className="text-rose-700 hover:text-rose-900 underline"
              >
                Agency
              </Link>
              <Link 
                href="/sign-up" 
                className="text-rose-700 hover:text-rose-900 underline"
              >
                Auditor
              </Link>
              <Link 
                href="/sign-up" 
                className="text-rose-700 hover:text-rose-900 underline"
              >
                Collection Manager
              </Link>
              <Link 
                href="/sign-up" 
                className="text-rose-700 hover:text-rose-900 underline"
              >
                Axis Employee
              </Link>
            </div>
          </div>
        </div>

        <div className="flex-1 relative w-full max-w-2xl flex justify-center items-center">
          <div className="absolute inset-0 -z-10 flex justify-center items-center">
            <Image
              src="/landing/blob-shape 1.png"
              alt="Background shape"
              width={800}
              height={800}
              className="object-contain opacity-80"
            />
          </div>
          <Image
            src="/landing/Illustration.png"
            alt="Collaboration illustration"
            width={700}
            height={500}
            className="object-contain"
            priority
          />
        </div>
      </main>

      {/* Mobile CTA Section */}
      <div className="md:hidden px-8 pb-8">
        <div className="flex flex-col gap-4">
          <Link
            href="/auth/register"
            className="w-full bg-rose-900 text-white px-6 py-3 rounded-md hover:bg-rose-950 transition-colors font-bold text-center"
          >
            Get Started - Sign Up
          </Link>
          <Link
            href="/auth/login"
            className="w-full border border-rose-900 text-rose-900 px-6 py-3 rounded-md hover:bg-rose-50 transition-colors font-bold text-center"
          >
            Login
          </Link>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex flex-col items-center">
        <span className="text-sm text-gray-500 mb-2">Scroll down</span>
        <div className="w-6 h-6 border-2 border-gray-400 rounded-full flex items-center justify-center animate-bounce">
          <div className="w-1 h-3 bg-gray-400 rounded-full"></div>
        </div>
      </div>
    </div>
  );
}