"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "~/lib/utils";
import {
  Home,
  Folder,
  Users,
  TrendingUp,
  FileText,
  Settings,
  Menu,
  X,
  Check,
} from "lucide-react";
import { useState } from "react";

const navigationItems = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: Home,
  },
  {
    name: "FCASH Workspace",
    href: "/fcash",
    icon: Folder,
  },
  {
    name: "PCNI Workspace",
    href: "/pcni",
    icon: Folder,
  },
  {
    name: "Client Master",
    href: "/clients",
    icon: Users,
  },
  {
    name: "Performance",
    href: "/performance",
    icon: TrendingUp,
  },
  {
    name: "Reports",
    href: "/reports",
    icon: FileText,
  },
  {
    name: "Admin",
    href: "/admin",
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Mobile menu button */}
      <div className="fixed top-0 right-0 left-0 z-50 border-b border-gray-200 bg-gray-100 p-4 lg:hidden">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          <span className="font-semibold">Menu</span>
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-40 h-screen w-64 border-r border-gray-200 bg-gray-100 transition-transform duration-300 ease-in-out lg:translate-x-0",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo/Brand */}
          <div className="flex h-14 items-center gap-3 border-b border-gray-200 px-6">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500">
              <Check size={18} className="text-white" />
            </div>
            <Link href="/" className="text-lg font-semibold text-gray-900">
              Client Updater v2
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4">
            <ul className="space-y-1 px-3">
              {navigationItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;

                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-gray-200 text-gray-900"
                          : "text-gray-700 hover:bg-gray-200 hover:text-gray-900",
                      )}
                    >
                      <Icon
                        size={20}
                        className={cn(
                          isActive ? "text-gray-900" : "text-gray-600",
                        )}
                      />
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Footer */}
          <div className="border-t border-gray-200 p-4">
            <div className="text-xs text-gray-500">
              © 2026 Client Updater v2
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  );
}
