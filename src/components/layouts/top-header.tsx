"use client";

import { Bell, Check } from "lucide-react";
import { UserButton } from "@clerk/nextjs";

export function TopHeader() {
  return (
    <header className="h-16 border-b border-gray-200 bg-white">
      <div className="flex h-full items-center justify-between px-6">
        {/* Left Section - Logo and App Name */}
        <div className="flex items-center gap-3">
          {/* App Logo - Emerald/teal rounded square with white checkmark icon */}
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-500">
            <Check size={20} className="text-white" />
          </div>
          {/* App Name */}
          <span className="text-lg font-semibold text-gray-900">
            Client Updater v2
          </span>
        </div>

        {/* Right Section - Notifications and User Profile */}
        <div className="flex items-center gap-4">
          {/* Notification Bell with red dot indicator */}
          <button className="relative rounded-md p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900">
            <Bell size={20} />
            {/* Red dot indicator at top-right corner */}
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500" />
          </button>

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
