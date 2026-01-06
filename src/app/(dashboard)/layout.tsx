"use client"

import { useState } from "react"
import { Sidebar } from "~/components/layouts/sidebar"
import { TopHeader } from "~/components/layouts/top-header"
import { Menu } from "lucide-react"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top Header */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <div className="flex items-center px-6">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors mr-3"
          >
            <Menu size={24} />
          </button>

          {/* TopHeader Component */}
          <div className="flex-1">
            <TopHeader />
          </div>
        </div>
      </div>

      {/* Main Layout Container */}
      <div className="flex pt-16">
        {/* Sidebar - Fixed on desktop, hidden on mobile */}
        <aside className="hidden lg:block fixed top-16 left-0 h-[calc(100vh-4rem)] w-64 bg-white border-r z-40">
          <Sidebar />
        </aside>

        {/* Mobile Sidebar - Overlay */}
        {isMobileMenuOpen && (
          <>
            <aside className="lg:hidden fixed top-16 left-0 h-[calc(100vh-4rem)] w-64 bg-white border-r z-40">
              <Sidebar />
            </aside>
            {/* Overlay for mobile */}
            <div
              className="lg:hidden fixed inset-0 top-16 bg-black/50 z-30"
              onClick={() => setIsMobileMenuOpen(false)}
            />
          </>
        )}

        {/* Main Content Area */}
        <main className="flex-1 lg:ml-64 pt-4 px-4 lg:px-8 pb-8">
          {children}
        </main>
      </div>
    </div>
  )
}
