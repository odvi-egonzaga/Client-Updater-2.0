"use client";

import { Bell, Check, Activity } from "lucide-react";
import { UserButton, useAuth } from "@clerk/nextjs";
import Link from "next/link";

export function TopHeader() {
  const { user } = useAuth();

  // Check if user has developer role
  const isDeveloper = user?.publicMetadata?.role === "developer";

  return (
    <header className="h-16 border-b border-gray-200 bg-white">
      <div className="flex h-full items-center justify-end px-6">
        {/* Right Section - Notifications, Health Check, and User Profile */}
        <div className="flex items-center gap-4">
          {/* Notification Bell with red dot indicator */}
          <button className="relative rounded-md p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900">
            <Bell size={20} />
            {/* Red dot indicator at top-right corner */}
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500" />
          </button>

          {/* Health Check Link - Only visible for developers */}
          {isDeveloper && (
            <Link
              href="/health"
              className="flex items-center gap-2 rounded-md p-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              <Activity size={20} />
              <span>Health Check</span>
            </Link>
          )}

          {/* User Profile Avatar - Clerk UserButton */}
          <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: {
                avatarBox: "w-9 h-9",
              },
            }}
          />
        </div>
      </div>
    </header>
  );
}
