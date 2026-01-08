"use client";

import { useState } from "react";
import { Sidebar } from "~/components/layouts/sidebar";
import { TopHeader } from "~/components/layouts/top-header";
import { Menu } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      {/* Main Layout Container */}
      <div className="flex">
        {/* Sidebar - Fixed on desktop, hidden on mobile */}
        <aside className="fixed top-0 left-0 z-40 hidden h-screen w-64 lg:block">
          <Sidebar />
        </aside>

        {/* Mobile Sidebar - Overlay */}
        {isMobileMenuOpen && (
          <>
            <aside className="fixed top-0 left-0 z-40 h-screen w-64 lg:hidden">
              <Sidebar />
            </aside>
            {/* Overlay for mobile */}
            <div
              className="fixed inset-0 z-30 bg-black/50 lg:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
          </>
        )}

        {/* Main Content Area */}
        <div className="flex-1 lg:ml-64">
          {/* Top Header - Only in main content area */}
          <div className="sticky top-0 z-30">
            <div className="flex items-center">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="mr-3 rounded-md p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 lg:hidden"
              >
                <Menu size={24} />
              </button>

              {/* TopHeader Component */}
              <div className="flex-1">
                <TopHeader />
              </div>
            </div>
          </div>

          {/* Page Content */}
          <main className="px-4 pt-4 pb-8 lg:px-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
